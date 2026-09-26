/* Global play counter — Cloudflare Pages Function.
   GET  /api/plays          → { "snake": 123, "doom-mario": 88 }
   POST /api/plays {id}     → increments, returns { id, plays }

   Requires a KV binding named PLAYS in wrangler.toml. Until the
   binding exists this degrades gracefully: GET returns {}, POST 503,
   and the landing page falls back to local ordering. */

import { json, sameSite, rateLimit, knownGame } from '../_lib/guard.js';

/* SECURITY (2026-09-26): POST must come from our own pages, name a known game (no invented
   "games" reaching the on-air champions list), and counts once per player per game per 5 min. */
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
  if (!sameSite(request)) return json({ error: 'forbidden' }, 403);
  let id;
  try {
    const text = await request.text();
    if (text.length > 512) return json({ error: 'too large' }, 413);
    id = JSON.parse(text).id;
  } catch {
    return json({ error: 'bad body' }, 400);
  }
  if (typeof id !== 'string' || !ID_RE.test(id) || !knownGame(id)) return json({ error: 'bad id' }, 400);
  if (!(await rateLimit(env, env.PLAYS, request, 'play-' + id, 1, 300))) return json({ ok: true, counted: false });

  try {
    const counts = await readCounts(env);
    counts[id] = (counts[id] || 0) + 1;
    await env.PLAYS.put(KEY, JSON.stringify(counts));
    return json({ id, plays: counts[id] });
  } catch {
    return json({ error: 'storage error' }, 500);
  }
}
