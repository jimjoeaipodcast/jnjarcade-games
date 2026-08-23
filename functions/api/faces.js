/* FACE LAB — community Jimmy/Joe LED expressions. Cloudflare Pages Function.

   POST /api/faces                {agent,name,author,dots:[[r,c]...]}   → {ok,id}
   GET  /api/faces?status=keeps   → {faces:[...]}          (public gallery: keeps|appearance)
   GET  /api/faces?status=pending&token=MOD → {faces:[...]} (moderation list)
   POST /api/faces/moderate       {id,status,token}        → {ok}  status: appearance|keeps|deleted|pending

   Storage: same PLAYS KV binding (keys: face:<id>). Deleted = status flag, never hard-removed
   (audit trail). Grid is 44×44; a face is a sparse list of lit dots. */

const GRID = 44;
const MAX_DOTS = 900;          // a full face is ~130; 900 = generous scribble ceiling
const VALID_STATUS = ['pending', 'appearance', 'keeps', 'deleted'];
const AGENTS = ['jimmy', 'joe'];

// same normalise/blocklist approach as scores.js
const LEET = { '0':'O','1':'I','2':'Z','3':'E','4':'A','5':'S','6':'G','7':'T','8':'B','9':'G','@':'A','$':'S','!':'I','+':'T' };
const BLOCKLIST = ['NIGGER','NIGGA','NEGER','COON','SPIC','KIKE','CHINK','GOOK','WETBACK','PAKI','RAGHEAD','TOWELHEAD','JIGABOO','TARBABY','GOLLIWOG','DARKIE','FAGGOT','FAG','TRANNY','DYKE','RETARD','SPAZ','FUCK','SHIT','CUNT','BITCH','ASSHOLE','WANKER','TWAT','PRICK','COCK','DICK','PUSSY','WHORE','SLUT','BASTARD','PISS','TITS','BOLLOCK','HITLER','NAZI','KKK','RAPIST','RAPE','PEDO','PAEDO'];
function nameOK(s) {
  const up = String(s).toUpperCase();
  let flat = '';
  for (const ch of up) flat += LEET[ch] || ch;
  flat = flat.replace(/[^A-Z]/g, '');
  return !BLOCKLIST.some(b => flat.includes(b));
}
function cleanText(raw, max) {
  // '@' is allowed because the Face Lab asks for "YOUR NAME/HANDLE" (Osimo 2026-08-23) —
  // without it a submitted @handle was silently saved with the @ stripped, i.e. we invited
  // a handle and then quietly mangled it. Harmless for the blocklist: nameOK() reduces to
  // A-Z before matching, so punctuation can neither evade nor trip it.
  return String(raw || '').replace(/[^\w@ .\-'!?]/g, '').trim().slice(0, max);
}

async function listFaces(env, status) {
  const out = [];
  let cursor;
  do {
    const page = await env.PLAYS.list({ prefix: 'face:', cursor });
    for (const k of page.keys) {
      const raw = await env.PLAYS.get(k.name);
      if (!raw) continue;
      try {
        const f = JSON.parse(raw);
        if (f.status === status) out.push(f);
      } catch (e) {}
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.sort((a, b) => (b.created || 0) - (a.created || 0));
  return out.slice(0, 200);
}

export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (!env.PLAYS) return new Response(JSON.stringify({ ok: false, error: 'no storage' }), { status: 503, headers: cors });

  if (request.method === 'GET') {
    const status = url.searchParams.get('status') || 'keeps';
    if (!VALID_STATUS.includes(status)) return new Response(JSON.stringify({ ok: false, error: 'bad status' }), { status: 400, headers: cors });
    // pending/deleted lists are moderation-only
    if ((status === 'pending' || status === 'deleted')
        && url.searchParams.get('token') !== env.FACELAB_MOD_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: 'unauthorised' }), { status: 403, headers: cors });
    }
    const faces = await listFaces(env, status);
    return new Response(JSON.stringify({ ok: true, faces }), { headers: cors });
  }

  if (request.method === 'POST') {
    let body;
    try { body = await request.json(); } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: 'bad json' }), { status: 400, headers: cors });
    }
    const agent = String(body.agent || '').toLowerCase();
    if (!AGENTS.includes(agent)) return new Response(JSON.stringify({ ok: false, error: 'bad agent' }), { status: 400, headers: cors });
    const name = cleanText(body.name, 28);
    const author = cleanText(body.author, 16);
    if (!name || name.length < 2) return new Response(JSON.stringify({ ok: false, error: 'name the expression (2+ chars)' }), { status: 400, headers: cors });
    if (!author || author.length < 2) return new Response(JSON.stringify({ ok: false, error: 'add your name (2+ chars)' }), { status: 400, headers: cors });
    if (!nameOK(name) || !nameOK(author)) return new Response(JSON.stringify({ ok: false, error: 'name rejected' }), { status: 400, headers: cors });
    const dots = Array.isArray(body.dots) ? body.dots : null;
    if (!dots || dots.length < 8) return new Response(JSON.stringify({ ok: false, error: 'draw something first (8+ dots)' }), { status: 400, headers: cors });
    if (dots.length > MAX_DOTS) return new Response(JSON.stringify({ ok: false, error: 'too many dots' }), { status: 400, headers: cors });
    const clean = [];
    const seen = new Set();
    for (const d of dots) {
      if (!Array.isArray(d) || d.length !== 2) continue;
      const r = d[0] | 0, c = d[1] | 0;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
      const key = r * GRID + c;
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push([r, c]);
    }
    if (clean.length < 8) return new Response(JSON.stringify({ ok: false, error: 'draw something first' }), { status: 400, headers: cors });
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const face = { id, agent, name, author, dots: clean, status: 'pending', created: Date.now() };
    await env.PLAYS.put(`face:${id}`, JSON.stringify(face));
    return new Response(JSON.stringify({ ok: true, id }), { headers: cors });
  }

  return new Response(JSON.stringify({ ok: false, error: 'method' }), { status: 405, headers: cors });
}
