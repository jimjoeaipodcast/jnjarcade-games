/* Punter layout hand-off — Cloudflare Pages Function.
   GET  /api/punters        → { savedAt, by, punters: [{x, feet, h}, ...] } or {}
   POST /api/punters {...}  → stores it, returns { ok: true, savedAt }

   This exists so Osimo can place THE COUNT's punters on his phone in
   tools/punter-placer.html and hit SUBMIT, instead of reading coordinates off a
   grid and typing them into Telegram. Claude reads the layout back from here and
   writes it into the game.

   Uses the SUBMISSIONS KV binding that already exists in wrangler.toml. Without
   the binding it degrades the same way plays.js does: GET {}, POST 503. */

// One key per room, so the two arcades cannot overwrite each other. 'hall' keeps the
// original unsuffixed key so the layout Osimo already submitted is not orphaned.
const ROOMS = { hall: 'the-count-punters', corridor: 'the-count-punters-corridor' };
function keyFor(room) { return ROOMS[room] || ROOMS.hall; }
const MAX = 40;                       // more than the nine machines, room to grow

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}

export async function onRequestGet({ request, env }) {
  if (!env.SUBMISSIONS) return json({});
  try {
    const room = new URL(request.url).searchParams.get('room') || 'hall';
    const raw = await env.SUBMISSIONS.get(keyFor(room));
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

  const room = ROOMS[body.room] ? body.room : 'hall';
  const rec = {
    savedAt: new Date().toISOString(),
    room,
    by: (typeof body.by === 'string' ? body.by : 'osimo').slice(0, 40),
    note: (typeof body.note === 'string' ? body.note : '').slice(0, 300),
    punters: clean,
  };
  try {
    await env.SUBMISSIONS.put(keyFor(room), JSON.stringify(rec));
    return json({ ok: true, savedAt: rec.savedAt, room, count: clean.length });
  } catch (e) {
    return json({ error: 'write failed' }, 500);
  }
}
