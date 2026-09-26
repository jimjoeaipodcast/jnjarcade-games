/* Global per-game leaderboards — Cloudflare Pages Function.
   GET  /api/scores?game=snake        → { scores: [{n,s,t}...] }  (top 100)
   POST /api/scores {game,name,score,run} → { rank, total, scores }

   SECURITY (2026-09-26 — Osimo's brother: "people were just adding scores without ever even
   playing"): a POST now needs a valid single-use RUN token from /api/run (issued when the game
   page loaded), at least MIN_RUN_S seconds of play, a score plausible for that time
   (per-game points-per-second cap), our own site as Origin, application/json, a known game
   (functions/_lib/games.js), and ≤ 30 submits/hour per player. See functions/_lib/guard.js.

   Uses the same PLAYS KV binding as /api/plays (keys: scores:<game>).
   Degrades gracefully without the binding: GET returns {scores:[]},
   POST returns 503 and the games fall back to local-only boards. */

import { json, sameSite, jsonBody, rateLimit, checkRun, markRunUsed, knownGame } from '../_lib/guard.js';

const GAME_RE = /^[a-z0-9-]{1,40}$/;
const MIN_RUN_S = 8;
// Points-per-second ceilings, generous on purpose (a real great run must never be refused).
// Calibrated against the live boards 2026-09-26; raise a game's cap here if a genuine record trips it.
const PPS = { 'pin-vaders': 40000, 'pin-vaders-2': 40000, 'the-count': 10000 };
const PPS_DEFAULT = 4000, SCORE_BASE = 5000;
const KEEP = 200;   // stored per game
const SHOW = 100;   // returned per request

/* Name moderation: normalise leetspeak + strip non-letters, then
   substring-match the blocklist. Server is the source of truth;
   the client runs the same check for instant feedback. */
const LEET = { '0':'O','1':'I','2':'Z','3':'E','4':'A','5':'S','6':'G','7':'T','8':'B','9':'G','@':'A','$':'S','!':'I','+':'T' };
const BLOCKLIST = [
  'NIGGER','NIGGA','NEGER','COON','SPIC','KIKE','CHINK','GOOK','WETBACK',
  'PAKI','RAGHEAD','TOWELHEAD','JIGABOO','TARBABY','GOLLIWOG','DARKIE',
  'FAGGOT','FAG','TRANNY','DYKE','RETARD','SPAZ',
  'FUCK','SHIT','CUNT','BITCH','ASSHOLE','WANKER','TWAT','PRICK','COCK',
  'DICK','PUSSY','WHORE','SLUT','BASTARD','PISS','TITS','BOLLOCK',
  'HITLER','NAZI','KKK','RAPIST','RAPE','PEDO','PAEDO',
];

function normalise(name) {
  const up = String(name).toUpperCase();
  let out = '';
  for (const ch of up) out += LEET[ch] || ch;
  return out.replace(/[^A-Z]/g, '');
}

export function nameAllowed(name) {
  const flat = normalise(name);
  return !BLOCKLIST.some(bad => flat.includes(bad));
}

function cleanName(raw) {
  const s = String(raw).toUpperCase().replace(/[^A-Z0-9 .\-]/g, '').trim().slice(0, 12);
  return s.length >= 2 ? s : null;
}

async function readScores(env, game) {
  const raw = await env.PLAYS.get('scores:' + game);
  return raw ? JSON.parse(raw) : [];
}

export async function onRequestGet({ request, env }) {
  const game = new URL(request.url).searchParams.get('game') || '';
  if (!GAME_RE.test(game)) return json({ error: 'bad game' }, 400);
  if (!env.PLAYS) return json({ scores: [] });
  try {
    // legend = the FIRST player ever to clear 100k on this game (write-once, permanent —
    // survives being beaten; Osimo 2026-08-18: "stays there forever even if someone
    // beats his score"). null until it happens.
    const legendRaw = await env.PLAYS.get('legend:' + game);
    return json({
      scores: (await readScores(env, game)).slice(0, SHOW),
      legend: legendRaw ? JSON.parse(legendRaw) : null,
    });
  } catch {
    return json({ scores: [] });
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.PLAYS) return json({ error: 'no storage' }, 503);
  if (!sameSite(request)) return json({ error: 'forbidden' }, 403);
  const { body, error } = await jsonBody(request, 4096);
  if (error) return error;

  const game = body.game;
  const score = Math.floor(Number(body.score));
  const name = cleanName(body.name);
  if (!GAME_RE.test(game || '') || !knownGame(game)) return json({ error: 'bad game' }, 400);
  if (!Number.isFinite(score) || score < 0 || score > 10_000_000) return json({ error: 'bad score' }, 400);
  if (!name) return json({ error: 'name too short' }, 400);
  if (!nameAllowed(name)) return json({ error: 'name not allowed' }, 422);

  const run = await checkRun(env, env.PLAYS, body.run);
  if (!run.ok) return json({ error: run.why }, 403);
  if (run.ageS < MIN_RUN_S) return json({ error: 'too quick' }, 403);
  if (score > SCORE_BASE + (PPS[game] || PPS_DEFAULT) * run.ageS) return json({ error: 'implausible score' }, 403);
  if (!(await rateLimit(env, env.PLAYS, request, 'score', 30, 3600))) return json({ error: 'slow down' }, 429);
  await markRunUsed(env.PLAYS, run.nonce);

  try {
    const scores = await readScores(env, game);
    const entry = { n: name, s: score, t: Date.now() };
    scores.push(entry);
    scores.sort((a, b) => b.s - a.s || a.t - b.t);
    if (scores.length > KEEP) scores.length = KEEP;
    await env.PLAYS.put('scores:' + game, JSON.stringify(scores));

    // WRITE-ONCE legend: the first submitted score ever to clear 100k is enshrined
    // permanently — never overwritten, even by a higher score later (Osimo 2026-08-18).
    if (score >= 100000) {
      const lk = 'legend:' + game;
      if (!(await env.PLAYS.get(lk))) await env.PLAYS.put(lk, JSON.stringify(entry));
    }

    const rank = scores.findIndex(e => e === entry) + 1; // 0 = fell off the board
    return json({
      rank: rank || scores.length,
      total: scores.length,
      scores: scores.slice(0, SHOW),
    });
  } catch {
    return json({ error: 'storage error' }, 500);
  }
}
