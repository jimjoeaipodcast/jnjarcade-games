/* POST /api/brightside-submit — receives viewer good-news submissions.
   Stores text + metadata in KV (SUBMISSIONS binding).
   Files up to 10 MB stored as base64 in KV alongside the text.
   Files over 10 MB: metadata stored, file rejected with friendly message.

   KV binding required (wrangler.toml):
     [[kv_namespaces]]
     binding = "SUBMISSIONS"
     id = "b53db53d08c045eda82205bcb2070581"

   Form fields (multipart/form-data):
     name      string  required
     location  string  optional
     message   string  required
     file      File    optional (photo / video / audio, max 10 MB)
*/

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_BODY_BYTES = 11 * 1024 * 1024; // 11 MB (body overhead)

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
  if (!env.SUBMISSIONS) {
    return json({ error: 'server not configured' }, 503);
  }

  const cl = parseInt(request.headers.get('Content-Length') || '0', 10);
  if (cl > MAX_BODY_BYTES) return json({ error: 'submission too large (max 10 MB file)' }, 413);

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json({ error: 'invalid form data' }, 400);
  }

  const TYPES    = ['brightside', 'amazon', 'seriously'];
  let   type     = String(formData.get('type')     || 'brightside').trim();
  if (!TYPES.includes(type)) type = 'brightside';
  const name     = String(formData.get('name')     || '').trim().slice(0, 100);
  const location = String(formData.get('location') || '').trim().slice(0, 100);
  const handle   = String(formData.get('handle')   || '').trim().slice(0, 60);
  const email    = String(formData.get('email')    || '').trim().slice(0, 200);
  const product  = String(formData.get('product')  || '').trim().slice(0, 150);
  const link     = String(formData.get('link')     || '').trim().slice(0, 500);
  const honeypot = String(formData.get('website')  || '').trim();
  const message  = String(formData.get('message')  || '').trim().slice(0, 3000);
  const file     = formData.get('file');

  if (!name)    return json({ error: 'name required' }, 400);
  if (message.length < 10) return json({ error: 'please tell us a little more' }, 400);

  // Amazon Finds: link is REQUIRED and must be a real Amazon product URL (ASIN present)
  if (type === 'amazon') {
    if (!link) return json({ error: 'Amazon product link is required — paste the URL from the product page' }, 400);
    const isAmazonDomain = /^https?:\/\/(www\.)?(amazon\.(com|co\.uk|com\.au|de|fr|es|it|ca|co\.jp|in|com\.br|com\.mx|nl|se|sg|ae|sa|com\.tr)|amzn\.to|amzn\.eu)\//i.test(link);
    const hasAsin = /\/dp\/[A-Z0-9]{10}|\/gp\/product\/[A-Z0-9]{10}|\/product\/[A-Z0-9]{10}/i.test(link);
    if (!isAmazonDomain) return json({ error: 'Link must be from Amazon (e.g. amazon.com/dp/...)' }, 400);
    if (!hasAsin) return json({ error: "That doesn't look like a product page — make sure you copy the URL from the product listing, not a search results page" }, 400);
  }

  if (link && !/^https?:\/\//i.test(link)) return json({ error: 'link must start with http' }, 400);

  // Honeypot filled = bot. Pretend success, store nothing.
  if (honeypot) return json({ ok: true, id: 'sub_ok' });

  // Rate limit: 10 per IP per hour. Generous on purpose — mobile CGNAT puts
  // whole crowds behind one IP; honeypot + moderation are the real spam wall.
  const ip     = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey  = `__rl_${ip}`;
  const rlRaw  = await env.SUBMISSIONS.get(rlKey);
  const rlCount = rlRaw ? parseInt(rlRaw, 10) : 0;
  if (rlCount >= 10) return json({ error: 'easy there — max 10 stories per hour. Come back soon!' }, 429);
  await env.SUBMISSIONS.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });

  const id  = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  // ── Build submission object ──────────────────────────────────────────────────
  const sub = {
    id,
    submitted: now,
    type,
    name,
    location: location || null,
    handle: handle || null,
    email: email || null,
    product: product || null,
    link: link || null,
    message,
    status: 'pending',
    file: null,
  };

  let fileWarning = null;

  if (file && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      fileWarning = `File "${file.name}" too large (${(file.size / 1024 / 1024).toFixed(1)} MB > 10 MB limit) — story saved without it`;
    } else {
      // Store file as base64 in a separate KV key.
      // Chunked encode — String.fromCharCode(...bytes) blows the call stack on
      // multi-MB files (corrupted a real 7.8MB submission 2026-07-08).
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = '';
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      const b64     = btoa(bin);
      const fileKey = `${id}_file`;
      await env.SUBMISSIONS.put(fileKey, b64, { expirationTtl: 60 * 60 * 24 * 90 }); // 90 days
      sub.file = {
        name:    file.name.replace(/[^a-zA-Z0-9._\- ]/g, '_').slice(0, 100),
        type:    file.type || 'application/octet-stream',
        size:    file.size,
        kv_key:  fileKey,
      };
    }
  }

  // ── Store submission metadata ────────────────────────────────────────────────
  await env.SUBMISSIONS.put(id, JSON.stringify(sub), { expirationTtl: 60 * 60 * 24 * 90 });

  // ── Keep a sorted index list ─────────────────────────────────────────────────
  let indexRaw = await env.SUBMISSIONS.get('__index__');
  const index  = indexRaw ? JSON.parse(indexRaw) : [];
  index.unshift(id); // newest first
  if (index.length > 500) index.splice(500); // cap at 500
  await env.SUBMISSIONS.put('__index__', JSON.stringify(index));

  const resp = { ok: true, id };
  if (fileWarning) resp.warning = fileWarning;
  return json(resp);
}
