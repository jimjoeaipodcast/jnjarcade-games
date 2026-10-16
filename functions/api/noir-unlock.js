/* /api/noir-unlock — founders gate for the JnJ Noir room (2026-10-16, from the StoryEngine handover).

   POST {key}  → verifies a Gumroad licence key SERVER-SIDE (never in the browser):
                 POST https://api.gumroad.com/v2/licenses/verify  product_id + license_key, increment_uses_count=false
                 refunded / chargebacked / disputed sales are rejected. On success a signed HttpOnly cookie
                 (noir_f) is set for 90 days; /api/noir-story reads it.
   GET         → {founder: true|false} for the page to draw the right state.
   DELETE      → clears the cookie (sign out).

   Secrets (Pages → Settings → Variables and Secrets, NEVER in the repo):
     GUMROAD_PRODUCT_ID   the founders product id from Gumroad
     NOIR_SECRET          random string that signs the cookie (RUN_SECRET is the fallback)
   Until GUMROAD_PRODUCT_ID is set the endpoint answers "founders keys not switched on yet" — deploying this
   changes nothing on its own. */

import { json, sameSite, jsonBody, rateLimit } from '../_lib/guard.js';

const COOKIE = 'noir_f';
const DAYS = 90;
const enc = new TextEncoder();

async function sign(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const secretOf = (env) => env.NOIR_SECRET || env.RUN_SECRET || '';

export async function founderFromCookie(request, env) {
  const raw = request.headers.get('Cookie') || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m || !secretOf(env)) return false;
  const parts = m[1].split('.');
  if (parts.length !== 3) return false;
  const [exp, kh, sig] = parts;
  if (Number(exp) < Date.now()) return false;
  return sig === await sign(secretOf(env), `${exp}.${kh}`);
}

function cookieHeader(value, maxAge) {
  return `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export async function onRequestGet({ request, env }) {
  return json({ founder: await founderFromCookie(request, env), configured: !!env.GUMROAD_PRODUCT_ID });
}

export async function onRequestDelete({ request }) {
  if (!sameSite(request)) return json({ error: 'forbidden' }, 403);
  return json({ ok: true }, 200, { 'Set-Cookie': cookieHeader('', 0) });
}

export async function onRequestPost({ request, env }) {
  if (!sameSite(request)) return json({ error: 'forbidden' }, 403);
  if (!env.GUMROAD_PRODUCT_ID || !secretOf(env)) return json({ error: 'founders keys not switched on yet' }, 503);
  if (env.PLAYS && !(await rateLimit(env, env.PLAYS, request, 'noir-unlock', 8, 600))) {
    return json({ error: 'too many tries — wait ten minutes' }, 429);
  }
  const { body, error } = await jsonBody(request, 4096);
  if (error) return error;
  const key = String(body?.key || '').trim();
  if (!/^[A-Za-z0-9-]{16,80}$/.test(key)) return json({ error: 'that does not look like a Gumroad key' }, 400);

  const form = new URLSearchParams({ product_id: env.GUMROAD_PRODUCT_ID, license_key: key, increment_uses_count: 'false' });
  let d;
  try {
    const r = await fetch('https://api.gumroad.com/v2/licenses/verify', { method: 'POST', body: form });
    d = await r.json();
  } catch {
    return json({ error: 'Gumroad did not answer — try again in a minute' }, 502);
  }
  const p = d?.purchase || {};
  if (!d?.success) return json({ error: 'key not recognised' }, 401);
  if (p.refunded || p.chargebacked || p.disputed || p.dispute_won) return json({ error: 'this key was refunded' }, 401);
  if (p.subscription_ended_at || p.subscription_cancelled_at || p.subscription_failed_at) {
    return json({ error: 'this membership has ended' }, 401);
  }

  const exp = Date.now() + DAYS * 86400 * 1000;
  const kh = (await sign(secretOf(env), 'k:' + key)).slice(0, 16);     // key hash, never the key itself
  const value = `${exp}.${kh}.${await sign(secretOf(env), `${exp}.${kh}`)}`;
  return json({ ok: true, founder: true }, 200, { 'Set-Cookie': cookieHeader(value, DAYS * 86400) });
}
