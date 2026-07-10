/* GET /api/brightside-submissions — list pending viewer submissions for dashboard review.
   Returns array of submission objects (no file data, just metadata).
   Secured by X-Dashboard-Secret header matching DASHBOARD_SECRET env var.
*/

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}

/* Single GET handler — CF Pages routes GET to onRequestGet when it exists, so the
   ?file= branch MUST live here (a separate onRequest wrapper never fires for GETs —
   that routing gap served the submission LIST as image bytes on 2026-07-08). */
export async function onRequestGet({ request, env }) {
  const secret = request.headers.get('X-Dashboard-Secret');
  if (env.DASHBOARD_SECRET && secret !== env.DASHBOARD_SECRET) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (!env.SUBMISSIONS) return json({ error: 'not configured' }, 503);

  // ?file=sub_xxx_file — return the stored base64 payload
  const fileId = new URL(request.url).searchParams.get('file');
  if (fileId) {
    const b64 = await env.SUBMISSIONS.get(fileId);
    if (!b64) return json({ error: 'not found' }, 404);
    return new Response(b64, {
      headers: {
        'Content-Type': 'text/plain',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  const indexRaw = await env.SUBMISSIONS.get('__index__');
  if (!indexRaw) return json({ submissions: [] });

  const index = JSON.parse(indexRaw);
  const limit = Math.min(50, index.length);

  const subs = await Promise.all(
    index.slice(0, limit).map(async id => {
      const raw = await env.SUBMISSIONS.get(id);
      return raw ? JSON.parse(raw) : null;
    })
  );

  return json({ submissions: subs.filter(Boolean) });
}
