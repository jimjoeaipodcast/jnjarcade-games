/* POST /api/stl-submit — Patreon studio-prop submissions (Osimo 2026-07-29).

   Patreons model something for the physical diorama, send the STL, Osimo prints the ones
   that make the cut and thanks the designer on air.

   Storage deliberately mirrors brightside-submit.js rather than inventing a second
   scheme: SUBMISSIONS KV, metadata under `stl:<id>`, the binary base64 under
   `<id>_file`. No R2 provisioning needed, and the dashboard already knows this shape.

   The chunked base64 encode below is NOT optional — String.fromCharCode(...bytes) blows
   the call stack on multi-MB files and silently corrupted a real 7.8 MB submission on
   2026-07-08. STLs are the largest thing this site accepts, so it would fail here first.

   KV binding (already in wrangler.toml):
     [[kv_namespaces]]
     binding = "SUBMISSIONS"
     id = "b53db53d08c045eda82205bcb2070581"

   Form fields (multipart/form-data):
     name      string  required  — what gets thanked on air
     patreon   string  required  — email/handle, to match the tier
     title     string  required  — what the object is
     why       string  required  — why it suits the studio (the part that decides it)
     original  yes|no  required  — own work declaration
     file      File    required  — .stl, max 10 MB
     website   string  honeypot
*/

const MAX_FILE_BYTES = 10 * 1024 * 1024;  // 10 MB
const MAX_BODY_BYTES = 11 * 1024 * 1024;  // body overhead on top of the file
const SCALE = '1:9';                      // placeholder while the diorama is built

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

  const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (cl > MAX_BODY_BYTES) {
    return json({ error: 'That STL is over the 10 MB limit — decimate the mesh and retry.' }, 413);
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'invalid form data' }, 400);
  }

  const name     = String(formData.get('name')     || '').trim().slice(0, 80);
  const patreon  = String(formData.get('patreon')  || '').trim().slice(0, 120);
  const title    = String(formData.get('title')    || '').trim().slice(0, 100);
  const why      = String(formData.get('why')      || '').trim().slice(0, 600);
  const original = String(formData.get('original') || '').trim();
  const honeypot = String(formData.get('website')  || '').trim();
  const file     = formData.get('file');

  if (honeypot) return json({ ok: true, id: 'stl_ok' });   // bot: fake success, store nothing

  if (!name)    return json({ error: 'name required' }, 400);
  if (!patreon) return json({ error: 'Patreon email or handle required' }, 400);
  if (!title)   return json({ error: 'tell us what it is' }, 400);
  if (why.length < 15) {
    return json({ error: 'tell us a bit more about why it suits the studio — that is what decides it' }, 400);
  }
  // Own-work declaration is a hard gate, not a checkbox we log and ignore: the whole
  // deal is an on-air credit, so we cannot knowingly credit someone else's model.
  if (original !== 'yes') {
    return json({ error: 'We can only take your own designs — the credit goes to the modeller.' }, 400);
  }
  if (!file || !file.size) return json({ error: 'attach your .stl file' }, 400);
  if (!/\.stl$/i.test(file.name || '')) return json({ error: 'that needs to be a .stl file' }, 400);
  if (file.size > MAX_FILE_BYTES) {
    return json({
      error: `That file is ${(file.size / 1048576).toFixed(1)} MB — the limit is 10 MB.`,
    }, 413);
  }

  // Rate limit: 5 STLs per IP per hour. Tighter than the story form because each one is
  // a print job someone has to physically run.
  const ip    = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = `__rl_stl_${ip}`;
  const rlRaw = await env.SUBMISSIONS.get(rlKey);
  const rlN   = rlRaw ? parseInt(rlRaw, 10) : 0;
  if (rlN >= 5) return json({ error: 'easy there — 5 models an hour. Come back soon!' }, 429);
  await env.SUBMISSIONS.put(rlKey, String(rlN + 1), { expirationTtl: 3600 });

  const id  = `stl_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // Chunked base64 — see header note. Do not "simplify" this to a spread.
  const bytes = new Uint8Array(await file.arrayBuffer());
  let bin = '';
  const CHUNK = 8192;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  const fileKey = `${id}_file`;
  await env.SUBMISSIONS.put(fileKey, btoa(bin), { expirationTtl: 60 * 60 * 24 * 180 }); // 180d

  const sub = {
    id,
    submitted: now,
    type: 'stl',
    name,
    patreon,
    title,
    why,
    original: true,
    scale: SCALE,
    status: 'pending',
    printed: false,
    thanked: false,          // flips once the on-air thank-you has aired
    file: {
      name:   (file.name || 'model.stl').replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 100),
      type:   file.type || 'application/sla',
      size:   file.size,
      kv_key: fileKey,
    },
  };

  await env.SUBMISSIONS.put(`stl:${id}`, JSON.stringify(sub));

  return json({ ok: true, id, scale: SCALE });
}
