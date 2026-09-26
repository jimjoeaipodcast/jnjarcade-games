/* Upcoming-channel likes — Cloudflare Pages Function.
   GET  /api/channel-likes              → { "movies": 12, "sports": 4, ... }
   POST /api/channel-likes {id, op}     → op 'like'|'unlike', returns { id, likes }

   Same shape and same KV binding as plays.js (binding PLAYS, separate key), so no
   new namespace/wrangler.toml change is needed. Degrades gracefully exactly like
   plays.js: GET returns {}, POST 503, and the cinema page falls back to its DOM
   order instead of showing an error.

   The COUNT IS NEVER SHOWN on the page (Osimo 2026-09-13: thumb yes, counter no) —
   it exists only to rank the cassettes. It is still returned by GET because the
   ranking happens client-side at render time (site Hard Rule 1: never rank from
   file order). */
import { sameSite, ipKey } from '../_lib/guard.js';


const KEY = 'channel-likes';

/* Allowlist, not a regex. These are the only cassettes that carry a thumb: the live
   channel and the zodiac deliberately have none (one is nearly aired, the other is
   next up — neither is up for a vote). An open id space would let anyone mint keys
   in the shared KV value. */
const LIKEABLE = new Set(['movies', 'muskverse', 'sports', 'macdell', 'war-of-words']);

async function readLikes(env) {
  const raw = await env.PLAYS.get(KEY);
  return raw ? JSON.parse(raw) : {};
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

export async function onRequestGet({ env }) {
  if (!env.PLAYS) return json({});
  try {
    return json(await readLikes(env));
  } catch {
    return json({});
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS) return json({ error: 'no storage' }, 503);

  let id, op;
  try {
    const body = JSON.parse(await request.text());
    id = body.id;
    op = body.op;
  } catch {
    return json({ error: 'bad body' }, 400);
  }
  if (typeof id !== 'string' || !LIKEABLE.has(id)) return json({ error: 'bad id' }, 400);
  if (op !== 'like' && op !== 'unlike') return json({ error: 'bad op' }, 400);
  if (!sameSite(request)) return json({ error: 'forbidden' }, 403);

  // SECURITY (2026-09-26): one like per player per channel, enforced HERE — the old check lived
  // only in the browser's localStorage, so likes were unlimited. Players are keyed by a hashed IP.
  const who = 'like:' + (await ipKey(request, env)) + ':' + id;
  const had = !!(await env.PLAYS.get(who));
  if ((op === 'like') === had) {                       // already liked / nothing to unlike
    const likes = await readLikes(env);
    return json({ id, likes: likes[id] || 0 });
  }

  try {
    if (op === 'like') await env.PLAYS.put(who, '1'); else await env.PLAYS.delete(who);
    const likes = await readLikes(env);
    const next = (likes[id] || 0) + (op === 'like' ? 1 : -1);
    likes[id] = next < 0 ? 0 : next;   // an unlike can never drive a count negative
    await env.PLAYS.put(KEY, JSON.stringify(likes));
    return json({ id, likes: likes[id] });
  } catch {
    return json({ error: 'write failed' }, 503);
  }
}
