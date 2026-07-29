/* POST /api/mashup-submit — Patreon cabinet pitches (Osimo 2026-07-29).

   Patreons pitch a two-game mash-up; the ones that make the cut get BUILT into the arcade
   with the pitcher's name on the cabinet.

   Text only — no upload — so none of stl-submit's file machinery applies here (no size
   ceiling, no chunked base64). Storage still mirrors it: SUBMISSIONS KV, metadata under
   `mashup:<id>`, so the dashboard reads one shape for every submission type.

   KV binding (already in wrangler.toml):
     [[kv_namespaces]]
     binding = "SUBMISSIONS"
     id = "b53db53d08c045eda82205bcb2070581"

   Form fields (multipart/form-data):
     name     string  required  — goes on the cabinet
     patreon  string  required  — email/handle, to match the tier
     gamea    string  required  — first parent game
     gameb    string  required  — second parent game
     twist    string  required  — the ONE idea that makes the collision work (min 15 chars)
     why      string  optional  — why it works on a phone
     website  string  honeypot
*/

const MAX_FIELD = 600;

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.SUBMISSIONS) return json({ error: 'server not configured' }, 503);

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'invalid form data' }, 400);
  }

  const name     = String(formData.get('name')     || '').trim().slice(0, 80);
  const patreon  = String(formData.get('patreon')  || '').trim().slice(0, 120);
  const gamea    = String(formData.get('gamea')    || '').trim().slice(0, 60);
  const gameb    = String(formData.get('gameb')    || '').trim().slice(0, 60);
  const twist    = String(formData.get('twist')    || '').trim().slice(0, MAX_FIELD);
  const why      = String(formData.get('why')      || '').trim().slice(0, 400);
  const honeypot = String(formData.get('website')  || '').trim();

  if (honeypot) return json({ ok: true, id: 'stl_ok' });   // bot: fake success, store nothing

  if (!name)    return json({ error: 'name required' }, 400);
  if (!patreon) return json({ error: 'Patreon email or handle required' }, 400);
  if (!gamea || !gameb) return json({ error: 'name both games' }, 400);
  if (twist.length < 15) {
    return json({ error: 'tell us the twist — that is the part that decides it' }, 400);
  }

  // Rate limit: 5 STLs per IP per hour. Tighter than the story form because each one is
  // a print job someone has to physically run.
  const ip    = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = `__rl_mashup_${ip}`;
  const rlRaw = await env.SUBMISSIONS.get(rlKey);
  const rlN   = rlRaw ? parseInt(rlRaw, 10) : 0;
  if (rlN >= 5) return json({ error: 'easy there — 5 pitches an hour. Come back soon!' }, 429);
  await env.SUBMISSIONS.put(rlKey, String(rlN + 1), { expirationTtl: 3600 });

  const id  = `mash_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const sub = {
    id,
    submitted: now,
    type: 'mashup',
    name,
    patreon,
    games: [gamea, gameb],
    title: `${gamea} × ${gameb}`,
    twist,
    why: why || null,
    status: 'pending',
    built: false,
    credited: false,        // flips once the cabinet ships and the shout has aired
  };

  await env.SUBMISSIONS.put(`mashup:${id}`, JSON.stringify(sub));

  return json({ ok: true, id });
}
