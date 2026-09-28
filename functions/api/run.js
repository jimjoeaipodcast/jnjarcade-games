/* Run tokens — POST /api/run {ts?} → { run }   (2026-09-26, security hardening)
   A game page asks for one when it loads (arcade-scores.js) and again after every submit.
   /api/scores refuses a score without a valid, unused token that is old enough for the score
   claimed. See functions/_lib/guard.js for the why.

   2026-09-28: when Turnstile is configured, the request must carry a fresh invisible-challenge
   token in `ts`. Without one we answer 403 {challenge:'turnstile', sitekey} and the page runs
   the challenge and asks again, so the sitekey lives only in Pages secrets, not in the JS. */
import { json, sameSite, jsonBody, rateLimit, issueRun, turnstileOn, verifyTurnstile } from '../_lib/guard.js';

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS || !env.RUN_SECRET) return json({ error: 'not configured' }, 503);
  if (!sameSite(request)) return json({ error: 'forbidden' }, 403);
  if (turnstileOn(env)) {
    const { body, error } = await jsonBody(request, 4096);
    if (error) return error;
    const challenge = { challenge: 'turnstile', sitekey: env.TURNSTILE_SITEKEY };
    if (!body || !body.ts) return json({ error: 'challenge', ...challenge }, 403);
    if (!(await verifyTurnstile(env, request, body.ts))) return json({ error: 'challenge failed', ...challenge }, 403);
  }
  if (!(await rateLimit(env, env.PLAYS, request, 'run', 120, 3600))) return json({ error: 'slow down' }, 429);
  return json({ run: await issueRun(env) });
}
