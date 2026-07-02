/* FACE LAB moderation — POST /api/faces/moderate {id,status,token}
   status: appearance (air once) | keeps (permanent personality) | deleted | pending */
const VALID = ['pending', 'appearance', 'keeps', 'deleted'];

export async function onRequestPost(ctx) {
  const { request, env } = ctx;
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  if (!env.PLAYS) return new Response(JSON.stringify({ ok: false, error: 'no storage' }), { status: 503, headers });
  let body;
  try { body = await request.json(); } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: 'bad json' }), { status: 400, headers });
  }
  if (!env.FACELAB_MOD_TOKEN || body.token !== env.FACELAB_MOD_TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: 'unauthorised' }), { status: 403, headers });
  }
  const id = String(body.id || '').replace(/[^a-z0-9\-]/g, '');
  const status = String(body.status || '');
  if (!id || !VALID.includes(status)) {
    return new Response(JSON.stringify({ ok: false, error: 'bad id/status' }), { status: 400, headers });
  }
  const raw = await env.PLAYS.get(`face:${id}`);
  if (!raw) return new Response(JSON.stringify({ ok: false, error: 'not found' }), { status: 404, headers });
  const face = JSON.parse(raw);
  face.status = status;
  face.moderated = Date.now();
  await env.PLAYS.put(`face:${id}`, JSON.stringify(face));
  return new Response(JSON.stringify({ ok: true, id, status }), { headers });
}
