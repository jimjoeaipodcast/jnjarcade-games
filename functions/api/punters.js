/* Punter layout hand-off — Cloudflare Pages Function.
   GET  /api/punters        → { savedAt, by, punters: [{x, feet, h}, ...] } or {}
   POST /api/punters {...}  → stores it, returns { ok: true, savedAt }

   This exists so Osimo can place THE COUNT's punters on his phone in
   tools/punter-placer.html and hit SUBMIT, instead of reading coordinates off a
   grid and typing them into Telegram. Claude reads the layout back from here and
   writes it into the game.

   Uses the SUBMISSIONS KV binding that already exists in wrangler.toml. Without
   the binding it degrades the same way plays.js does: GET {}, POST 503. */

const KEY = 'the-count-punters';
const MAX = 40;                       // more than the nine machines, room to grow

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet({ env }) {
  if (!env.SUBMISSIONS) return json({});
  try {
    const raw = await env.SUBMISSIONS.get(KEY);
    return json(raw ? JSON.parse(raw) : {});
  } catch {
    return json({});
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.SUBMISSIONS) return json({ error: 'no storage' }, 503);

  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return json({ error: 'bad body' }, 400);
  }
  if (!Array.isArray(body.punters) || !body.punters.length || body.punters.length > MAX) {
    return json({ error: 'bad punters' }, 400);
  }
  // Every field is clamped rather than trusted: this endpoint is public, and the numbers
  // it stores end up as geometry in a shipped game.
  const clean = [];
  for (const p of body.punters) {
    const n = (v, lo, hi) => {
      const f = Math.round(Number(v));
      return Number.isFinite(f) ? Math.max(lo, Math.min(hi, f)) : null;
    };
    const x = n(p.x, -200, 1160), feet = n(p.feet, 0, 700), h = n(p.h, 20, 460);
    if (x === null || feet === null || h === null) return json({ error: 'bad numbers' }, 400);
    clean.push({ i: clean.length, x, feet, h, flip: !!p.flip });
  }

  const rec = {
    savedAt: new Date().toISOString(),
    by: (typeof body.by === 'string' ? body.by : 'osimo').slice(0, 40),
    note: (typeof body.note === 'string' ? body.note : '').slice(0, 300),
    punters: clean,
  };
  try {
    await env.SUBMISSIONS.put(KEY, JSON.stringify(rec));
    return json({ ok: true, savedAt: rec.savedAt, count: clean.length });
  } catch (e) {
    return json({ error: 'write failed' }, 500);
  }
}
