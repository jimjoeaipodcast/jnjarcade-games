/* Shared write-endpoint guards — jnjarcade.win (2026-09-26).

   Osimo's brother found anyone could POST high scores without playing. The audit found every
   write endpoint open: no proof of play, no rate limit, no origin check, any text/plain POST
   from any other website accepted (no CORS preflight), placer layouts overwritable by anyone.

   What these guards give each endpoint:
     sameSite(request)     the POST must come from our own pages (Origin/Referer). Stops other
                           websites driving visitors' browsers (CSRF). curl can fake a header,
                           so this is NOT authentication — it is one layer.
     jsonBody(request)     Content-Type must be application/json. A cross-site JSON POST needs a
                           CORS preflight, which we never grant to foreign origins.
     rateLimit(...)        per-IP counters in KV (IPs hashed with a server secret, never stored raw).
     issueRun / checkRun   an HMAC-signed, single-use, time-stamped RUN TOKEN handed to a real
                           game page on load. A score needs one, and must be plausible for the
                           time since it was issued. Secret: env.RUN_SECRET (Pages secret).
     knownGame(slug)       only slugs in _lib/games.js (generated from games/*.html + aliases).

   Honest limit: the game runs in the player's browser, so a determined cheater can still fake a
   score that is plausible for a real run. This closes the one-command forgery, floods, fake
   games, and the no-play submissions — it cannot make a client-side game tamper-proof. */

import { GAMES } from './games.js';

const ALLOWED_HOSTS = ['jnjarcade.win', 'www.jnjarcade.win', 'localhost', '127.0.0.1'];
const PAGES_DEV = /\.jnjarcade-games\.pages\.dev$/;

export function json(obj, status = 200, extra = {}) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra },
  });
}

function hostOf(u) { try { return new URL(u).hostname; } catch { return ''; } }
function okHost(h) { return ALLOWED_HOSTS.includes(h) || PAGES_DEV.test(h); }

export function sameSite(request) {
  const origin = request.headers.get('Origin');
  if (origin) return okHost(hostOf(origin));
  const ref = request.headers.get('Referer');       // some beacons omit Origin
  return ref ? okHost(hostOf(ref)) : false;
}

export async function jsonBody(request, maxBytes = 64 * 1024) {
  const ct = (request.headers.get('Content-Type') || '').toLowerCase();
  if (!ct.startsWith('application/json')) return { error: json({ error: 'json only' }, 415) };
  const text = await request.text();
  if (text.length > maxBytes) return { error: json({ error: 'too large' }, 413) };
  try { return { body: JSON.parse(text) }; } catch { return { error: json({ error: 'bad body' }, 400) }; }
}

/* ---- crypto helpers ---- */
const enc = new TextEncoder();
async function hmacKey(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function sign(secret, msg) { return b64url(await crypto.subtle.sign('HMAC', await hmacKey(secret), enc.encode(msg))); }

export async function ipKey(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  return (await sign(env.RUN_SECRET || 'no-secret', 'ip:' + ip)).slice(0, 22);
}

/* Per-IP fixed-window counter. KV is eventually consistent, so limits are approximate — good
   enough to stop floods. Costs one KV write per ALLOWED request. */
export async function rateLimit(env, kv, request, bucket, limit, windowSec) {
  const win = Math.floor(Date.now() / 1000 / windowSec);
  const key = `rl:${bucket}:${await ipKey(request, env)}:${win}`;
  const n = parseInt((await kv.get(key)) || '0', 10);
  if (n >= limit) return false;
  await kv.put(key, String(n + 1), { expirationTtl: Math.max(60, windowSec * 2) });
  return true;
}

/* ---- run tokens ---- */
export async function issueRun(env) {
  const t0 = Date.now();
  const nonce = b64url(crypto.getRandomValues(new Uint8Array(12)));
  const sig = await sign(env.RUN_SECRET, `${t0}.${nonce}`);
  return `${t0}.${nonce}.${sig}`;
}

/* Returns {ok, ageS, nonce} or {ok:false, why}. Single use is enforced by the caller after the
   score is accepted (markRunUsed), so a rejected submit does not burn the token. */
export async function checkRun(env, kv, token) {
  if (!env.RUN_SECRET) return { ok: false, why: 'server not configured' };
  const parts = String(token || '').split('.');
  if (parts.length !== 3) return { ok: false, why: 'no run' };
  const [t0s, nonce, sig] = parts;
  if (sig !== await sign(env.RUN_SECRET, `${t0s}.${nonce}`)) return { ok: false, why: 'bad run' };
  const ageS = (Date.now() - Number(t0s)) / 1000;
  if (!(ageS >= 0) || ageS > 12 * 3600) return { ok: false, why: 'run expired' };
  if (await kv.get('run:' + nonce)) return { ok: false, why: 'run used' };
  return { ok: true, ageS, nonce };
}
export async function markRunUsed(kv, nonce) {
  await kv.put('run:' + nonce, '1', { expirationTtl: 13 * 3600 });
}

/* ---- Cloudflare Turnstile (2026-09-28) ----
   After the 09-26 guards a script could still fake the Origin header, take a run token, wait,
   and post a "plausible" score. An invisible Turnstile check before each run token stops
   scripts: no real browser, no token. Off until env.TURNSTILE_SECRET + TURNSTILE_SITEKEY are
   set as Pages secrets, so deploying this changes nothing on its own. Free, not metered. */
export function turnstileOn(env) { return !!(env.TURNSTILE_SECRET && env.TURNSTILE_SITEKEY); }

export async function verifyTurnstile(env, request, token) {
  if (!token || typeof token !== 'string' || token.length > 2048) return false;
  const form = new FormData();
  form.append('secret', env.TURNSTILE_SECRET);
  form.append('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.append('remoteip', ip);
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form });
    const d = await r.json();
    // Test keys report hostname "example.com"; real keys report the page's host.
    const testKey = env.TURNSTILE_SITEKEY.startsWith('1x0000');
    return !!d.success && (okHost(d.hostname || '') || (testKey && d.hostname === 'example.com'));
  } catch { return false; }
}

/* ---- game allowlist ----
   NOT an asset probe: Pages answers a missing path with an HTML fallback at HTTP 200, so
   "does /games/<slug>.html exist" is true for every slug. Static list, generated from games/. */
export function knownGame(slug) { return GAMES.has(String(slug || '')); }

/* ---- placer tools (punter-placer, press-painter, overlay-placer, hud-painter) ----
   Their saved layouts become geometry in the live game and are read back by Claude as Osimo's
   decisions, so a write needs env.PLACER_SECRET. The pages carry it as ?key=… (Osimo's bookmark
   links) and send it in the X-Placer-Key header. `by` is limited to osimo|claude. */
export function placerAuthorised(request, env) {
  const k = request.headers.get('X-Placer-Key') || '';
  return !!env.PLACER_SECRET && k.length > 0 && k === env.PLACER_SECRET;
}
export function placerBy(v) { return v === 'claude' ? 'claude' : 'osimo'; }
