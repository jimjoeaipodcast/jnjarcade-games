/* Global play counter — Cloudflare Pages Function.
   GET  /api/plays          → { "snake": 123, "doom-mario": 88 }
   POST /api/plays {id}     → increments, returns { id, plays }

   Requires a KV binding named PLAYS in wrangler.toml. Until the
   binding exists this degrades gracefully: GET returns {}, POST 503,
   and the landing page falls back to local ordering. */

const KEY = 'counts';
const ID_RE = /^[a-z0-9-]{1,40}$/;

async function readCounts(env) {
  const raw = await env.PLAYS.get(KEY);
  return raw ? JSON.parse(raw) : {};
}

export async function onRequestGet({ env }) {
  if (!env.PLAYS) return json({});
  try {
    return json(await readCounts(env));
  } catch {
    return json({});
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS) return json({ error: 'no storage' }, 503);
  let id;
  try {
    const body = JSON.parse(await request.text());
    id = body.id;
  } catch {
    return json({ error: 'bad body' }, 400);
  }
  if (typeof id !== 'string' || !ID_RE.test(id)) return json({ error: 'bad id' }, 400);

  try {
    const counts = await readCounts(env);
    counts[id] = (counts[id] || 0) + 1;
    await env.PLAYS.put(KEY, JSON.stringify(counts));
    return json({ id, plays: counts[id] });
  } catch {
    return json({ error: 'storage error' }, 500);
  }
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}
