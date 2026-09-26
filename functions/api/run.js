/* Run tokens — POST /api/run → { run }   (2026-09-26, security hardening)
   A game page asks for one when it loads (arcade-scores.js) and again after every submit.
   /api/scores refuses a score without a valid, unused token that is old enough for the score
   claimed. See functions/_lib/guard.js for the why. */
import { json, sameSite, rateLimit, issueRun } from '../_lib/guard.js';

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS || !env.RUN_SECRET) return json({ error: 'not configured' }, 503);
  if (!sameSite(request)) return json({ error: 'forbidden' }, 403);
  if (!(await rateLimit(env, env.PLAYS, request, 'run', 120, 3600))) return json({ error: 'slow down' }, 429);
  return json({ run: await issueRun(env) });
}
