/* Painted press-zones and dragged overlay points — Cloudflare Pages Function.
   GET  /api/press?room=<room>[&kind=paint|points]
   POST /api/press {room, kind, ...}

   Two shapes share this endpoint because they answer the same question — "where
   exactly does this thing live" — and Claude reads them back the same way:

     kind 'paint'  → { cell, names[], cells: [[x, y, targetIndex], ...] }
                     from tools/press-painter.html: what Osimo coloured in.
     kind 'points' → { items: [{ id, x, y, w, h }, ...] }
                     from tools/overlay-placer.html: dragged anchors and boxes.

   Uses the SUBMISSIONS KV binding. Without it: GET {}, POST 503, same as plays.js. */

const OK_ROOM = /^[a-z][a-z0-9-]{0,24}$/;
const MAX_CELLS = 6000;                 // the whole 96x54 grid is 5184
const MAX_ITEMS = 60;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
}
function keyFor(room, kind) { return `the-count-press-${kind}-${room}`; }

export async function onRequestGet({ request, env }) {
  if (!env.SUBMISSIONS) return json({});
  try {
    const q = new URL(request.url).searchParams;
    const room = q.get('room') || 'hall';
    const kind = q.get('kind') === 'points' ? 'points' : 'paint';
    if (!OK_ROOM.test(room)) return json({});
    const raw = await env.SUBMISSIONS.get(keyFor(room, kind));
    return json(raw ? JSON.parse(raw) : {});
  } catch {
    return json({});
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.SUBMISSIONS) return json({ error: 'no storage' }, 503);

  let body;
  try { body = JSON.parse(await request.text()); } catch { return json({ error: 'bad body' }, 400); }

  const room = String(body.room || 'hall');
  if (!OK_ROOM.test(room)) return json({ error: 'bad room' }, 400);
  const kind = body.kind === 'points' ? 'points' : (Array.isArray(body.cells) ? 'paint' : 'points');

  // Everything is clamped: this endpoint is public and its numbers become hit-tests.
  const int = (v, lo, hi) => {
    const n = Math.round(Number(v));
    return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : null;
  };
  const rec = { savedAt: new Date().toISOString(), room, kind,
                by: String(body.by || 'osimo').slice(0, 40) };

  if (kind === 'paint') {
    if (!Array.isArray(body.cells) || !body.cells.length || body.cells.length > MAX_CELLS) {
      return json({ error: 'bad cells' }, 400);
    }
    const cells = [];
    for (const c of body.cells) {
      if (!Array.isArray(c) || c.length < 3) return json({ error: 'bad cell' }, 400);
      const x = int(c[0], 0, 255), y = int(c[1], 0, 255), i = int(c[2], 0, 63);
      if (x === null || y === null || i === null) return json({ error: 'bad cell' }, 400);
      cells.push([x, y, i]);
    }
    rec.cell = int(body.cell, 1, 64) || 10;
    rec.names = Array.isArray(body.names) ? body.names.slice(0, 64).map(n => String(n).slice(0, 40)) : [];
    rec.cells = cells;
  } else {
    if (!Array.isArray(body.items) || !body.items.length || body.items.length > MAX_ITEMS) {
      return json({ error: 'bad items' }, 400);
    }
    rec.items = body.items.map(it => ({
      id: String(it.id || '').slice(0, 40),
      x: int(it.x, -400, 1400), y: int(it.y, -400, 1000),
      w: it.w === undefined ? undefined : int(it.w, 0, 1400),
      h: it.h === undefined ? undefined : int(it.h, 0, 1000),
    }));
    if (rec.items.some(it => it.x === null || it.y === null)) return json({ error: 'bad numbers' }, 400);
  }

  try {
    await env.SUBMISSIONS.put(keyFor(room, kind), JSON.stringify(rec));
    return json({ ok: true, savedAt: rec.savedAt, room, kind,
                  count: kind === 'paint' ? rec.cells.length : rec.items.length });
  } catch {
    return json({ error: 'write failed' }, 500);
  }
}
