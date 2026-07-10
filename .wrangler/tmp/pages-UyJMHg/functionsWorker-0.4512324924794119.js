var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// api/faces/moderate.js
var VALID = ["pending", "appearance", "keeps", "deleted"];
async function onRequestPost(ctx) {
  const { request, env } = ctx;
  const headers = { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" };
  if (!env.PLAYS) return new Response(JSON.stringify({ ok: false, error: "no storage" }), { status: 503, headers });
  let body;
  try {
    body = await request.json();
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: "bad json" }), { status: 400, headers });
  }
  if (!env.FACELAB_MOD_TOKEN || body.token !== env.FACELAB_MOD_TOKEN) {
    return new Response(JSON.stringify({ ok: false, error: "unauthorised" }), { status: 403, headers });
  }
  const id = String(body.id || "").replace(/[^a-z0-9\-]/g, "");
  const status = String(body.status || "");
  if (!id || !VALID.includes(status)) {
    return new Response(JSON.stringify({ ok: false, error: "bad id/status" }), { status: 400, headers });
  }
  const raw = await env.PLAYS.get(`face:${id}`);
  if (!raw) return new Response(JSON.stringify({ ok: false, error: "not found" }), { status: 404, headers });
  const face = JSON.parse(raw);
  face.status = status;
  face.moderated = Date.now();
  await env.PLAYS.put(`face:${id}`, JSON.stringify(face));
  return new Response(JSON.stringify({ ok: true, id, status }), { headers });
}
__name(onRequestPost, "onRequestPost");

// api/brightside-config.js
async function onRequestGet({ env }) {
  return new Response(
    JSON.stringify({
      clientId: env.GOOGLE_CLIENT_ID || "",
      channelId: env.YT_CHANNEL_ID || "UC61SJtnVHwbSCJ7YbNo87fw"
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*"
      }
    }
  );
}
__name(onRequestGet, "onRequestGet");

// api/brightside-submissions.js
function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(json, "json");
async function onRequestGet2({ request, env }) {
  const secret = request.headers.get("X-Dashboard-Secret");
  if (env.DASHBOARD_SECRET && secret !== env.DASHBOARD_SECRET) {
    return json({ error: "unauthorized" }, 401);
  }
  if (!env.SUBMISSIONS) return json({ error: "not configured" }, 503);
  const fileId = new URL(request.url).searchParams.get("file");
  if (fileId) {
    const b64 = await env.SUBMISSIONS.get(fileId);
    if (!b64) return json({ error: "not found" }, 404);
    return new Response(b64, {
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  const indexRaw = await env.SUBMISSIONS.get("__index__");
  if (!indexRaw) return json({ submissions: [] });
  const index = JSON.parse(indexRaw);
  const limit = Math.min(50, index.length);
  const subs = await Promise.all(
    index.slice(0, limit).map(async (id) => {
      const raw = await env.SUBMISSIONS.get(id);
      return raw ? JSON.parse(raw) : null;
    })
  );
  return json({ submissions: subs.filter(Boolean) });
}
__name(onRequestGet2, "onRequestGet");

// api/brightside-submit.js
var MAX_FILE_BYTES = 10 * 1024 * 1024;
var MAX_BODY_BYTES = 11 * 1024 * 1024;
function json2(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
__name(json2, "json");
async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
__name(onRequestOptions, "onRequestOptions");
async function onRequestPost2({ request, env }) {
  if (!env.SUBMISSIONS) {
    return json2({ error: "server not configured" }, 503);
  }
  const cl = parseInt(request.headers.get("Content-Length") || "0", 10);
  if (cl > MAX_BODY_BYTES) return json2({ error: "submission too large (max 10 MB file)" }, 413);
  let formData;
  try {
    formData = await request.formData();
  } catch {
    return json2({ error: "invalid form data" }, 400);
  }
  const TYPES = ["brightside", "amazon", "seriously"];
  let type = String(formData.get("type") || "brightside").trim();
  if (!TYPES.includes(type)) type = "brightside";
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const location = String(formData.get("location") || "").trim().slice(0, 100);
  const handle = String(formData.get("handle") || "").trim().slice(0, 60);
  const email = String(formData.get("email") || "").trim().slice(0, 200);
  const product = String(formData.get("product") || "").trim().slice(0, 150);
  const link = String(formData.get("link") || "").trim().slice(0, 500);
  const honeypot = String(formData.get("website") || "").trim();
  const message = String(formData.get("message") || "").trim().slice(0, 3e3);
  const file = formData.get("file");
  if (!name) return json2({ error: "name required" }, 400);
  if (message.length < 10) return json2({ error: "please tell us a little more" }, 400);
  if (type === "amazon") {
    if (!link) return json2({ error: "Amazon product link is required \u2014 paste the URL from the product page" }, 400);
    const isAmazonDomain = /^https?:\/\/(www\.)?(amazon\.(com|co\.uk|com\.au|de|fr|es|it|ca|co\.jp|in|com\.br|com\.mx|nl|se|sg|ae|sa|com\.tr)|amzn\.to|amzn\.eu)\//i.test(link);
    const hasAsin = /\/dp\/[A-Z0-9]{10}|\/gp\/product\/[A-Z0-9]{10}|\/product\/[A-Z0-9]{10}/i.test(link);
    if (!isAmazonDomain) return json2({ error: "Link must be from Amazon (e.g. amazon.com/dp/...)" }, 400);
    if (!hasAsin) return json2({ error: "That doesn't look like a product page \u2014 make sure you copy the URL from the product listing, not a search results page" }, 400);
  }
  if (link && !/^https?:\/\//i.test(link)) return json2({ error: "link must start with http" }, 400);
  if (honeypot) return json2({ ok: true, id: "sub_ok" });
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const rlKey = `__rl_${ip}`;
  const rlRaw = await env.SUBMISSIONS.get(rlKey);
  const rlCount = rlRaw ? parseInt(rlRaw, 10) : 0;
  if (rlCount >= 10) return json2({ error: "easy there \u2014 max 10 stories per hour. Come back soon!" }, 429);
  await env.SUBMISSIONS.put(rlKey, String(rlCount + 1), { expirationTtl: 3600 });
  const id = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = (/* @__PURE__ */ new Date()).toISOString();
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
    status: "pending",
    file: null
  };
  let fileWarning = null;
  if (file && file.size > 0) {
    if (file.size > MAX_FILE_BYTES) {
      fileWarning = `File "${file.name}" too large (${(file.size / 1024 / 1024).toFixed(1)} MB > 10 MB limit) \u2014 story saved without it`;
    } else {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      const CHUNK = 8192;
      for (let i = 0; i < bytes.length; i += CHUNK) {
        bin += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
      }
      const b64 = btoa(bin);
      const fileKey = `${id}_file`;
      await env.SUBMISSIONS.put(fileKey, b64, { expirationTtl: 60 * 60 * 24 * 90 });
      sub.file = {
        name: file.name.replace(/[^a-zA-Z0-9._\- ]/g, "_").slice(0, 100),
        type: file.type || "application/octet-stream",
        size: file.size,
        kv_key: fileKey
      };
    }
  }
  await env.SUBMISSIONS.put(id, JSON.stringify(sub), { expirationTtl: 60 * 60 * 24 * 90 });
  let indexRaw = await env.SUBMISSIONS.get("__index__");
  const index = indexRaw ? JSON.parse(indexRaw) : [];
  index.unshift(id);
  if (index.length > 500) index.splice(500);
  await env.SUBMISSIONS.put("__index__", JSON.stringify(index));
  const resp = { ok: true, id };
  if (fileWarning) resp.warning = fileWarning;
  return json2(resp);
}
__name(onRequestPost2, "onRequestPost");

// api/plays.js
var KEY = "counts";
var ID_RE = /^[a-z0-9-]{1,40}$/;
async function readCounts(env) {
  const raw = await env.PLAYS.get(KEY);
  return raw ? JSON.parse(raw) : {};
}
__name(readCounts, "readCounts");
async function onRequestGet3({ env }) {
  if (!env.PLAYS) return json3({});
  try {
    return json3(await readCounts(env));
  } catch {
    return json3({});
  }
}
__name(onRequestGet3, "onRequestGet");
async function onRequestPost3({ request, env }) {
  if (!env.PLAYS) return json3({ error: "no storage" }, 503);
  let id;
  try {
    const body = JSON.parse(await request.text());
    id = body.id;
  } catch {
    return json3({ error: "bad body" }, 400);
  }
  if (typeof id !== "string" || !ID_RE.test(id)) return json3({ error: "bad id" }, 400);
  try {
    const counts = await readCounts(env);
    counts[id] = (counts[id] || 0) + 1;
    await env.PLAYS.put(KEY, JSON.stringify(counts));
    return json3({ id, plays: counts[id] });
  } catch {
    return json3({ error: "storage error" }, 500);
  }
}
__name(onRequestPost3, "onRequestPost");
function json3(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
__name(json3, "json");

// api/scores.js
var GAME_RE = /^[a-z0-9-]{1,40}$/;
var KEEP = 200;
var SHOW = 100;
var LEET = { "0": "O", "1": "I", "2": "Z", "3": "E", "4": "A", "5": "S", "6": "G", "7": "T", "8": "B", "9": "G", "@": "A", "$": "S", "!": "I", "+": "T" };
var BLOCKLIST = [
  "NIGGER",
  "NIGGA",
  "NEGER",
  "COON",
  "SPIC",
  "KIKE",
  "CHINK",
  "GOOK",
  "WETBACK",
  "PAKI",
  "RAGHEAD",
  "TOWELHEAD",
  "JIGABOO",
  "TARBABY",
  "GOLLIWOG",
  "DARKIE",
  "FAGGOT",
  "FAG",
  "TRANNY",
  "DYKE",
  "RETARD",
  "SPAZ",
  "FUCK",
  "SHIT",
  "CUNT",
  "BITCH",
  "ASSHOLE",
  "WANKER",
  "TWAT",
  "PRICK",
  "COCK",
  "DICK",
  "PUSSY",
  "WHORE",
  "SLUT",
  "BASTARD",
  "PISS",
  "TITS",
  "BOLLOCK",
  "HITLER",
  "NAZI",
  "KKK",
  "RAPIST",
  "RAPE",
  "PEDO",
  "PAEDO"
];
function normalise(name) {
  const up = String(name).toUpperCase();
  let out = "";
  for (const ch of up) out += LEET[ch] || ch;
  return out.replace(/[^A-Z]/g, "");
}
__name(normalise, "normalise");
function nameAllowed(name) {
  const flat = normalise(name);
  return !BLOCKLIST.some((bad) => flat.includes(bad));
}
__name(nameAllowed, "nameAllowed");
function cleanName(raw) {
  const s = String(raw).toUpperCase().replace(/[^A-Z0-9 .\-]/g, "").trim().slice(0, 12);
  return s.length >= 2 ? s : null;
}
__name(cleanName, "cleanName");
async function readScores(env, game) {
  const raw = await env.PLAYS.get("scores:" + game);
  return raw ? JSON.parse(raw) : [];
}
__name(readScores, "readScores");
async function onRequestGet4({ request, env }) {
  const game = new URL(request.url).searchParams.get("game") || "";
  if (!GAME_RE.test(game)) return json4({ error: "bad game" }, 400);
  if (!env.PLAYS) return json4({ scores: [] });
  try {
    return json4({ scores: (await readScores(env, game)).slice(0, SHOW) });
  } catch {
    return json4({ scores: [] });
  }
}
__name(onRequestGet4, "onRequestGet");
async function onRequestPost4({ request, env }) {
  if (!env.PLAYS) return json4({ error: "no storage" }, 503);
  let body;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return json4({ error: "bad body" }, 400);
  }
  const game = body.game;
  const score = Math.floor(Number(body.score));
  const name = cleanName(body.name);
  if (!GAME_RE.test(game || "")) return json4({ error: "bad game" }, 400);
  if (!Number.isFinite(score) || score < 0 || score > 1e7) return json4({ error: "bad score" }, 400);
  if (!name) return json4({ error: "name too short" }, 400);
  if (!nameAllowed(name)) return json4({ error: "name not allowed" }, 422);
  try {
    const scores = await readScores(env, game);
    const entry = { n: name, s: score, t: Date.now() };
    scores.push(entry);
    scores.sort((a, b) => b.s - a.s || a.t - b.t);
    if (scores.length > KEEP) scores.length = KEEP;
    await env.PLAYS.put("scores:" + game, JSON.stringify(scores));
    const rank = scores.findIndex((e) => e === entry) + 1;
    return json4({
      rank: rank || scores.length,
      total: scores.length,
      scores: scores.slice(0, SHOW)
    });
  } catch {
    return json4({ error: "storage error" }, 500);
  }
}
__name(onRequestPost4, "onRequestPost");
function json4(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
  });
}
__name(json4, "json");

// api/faces.js
var GRID = 44;
var MAX_DOTS = 900;
var VALID_STATUS = ["pending", "appearance", "keeps", "deleted"];
var AGENTS = ["jimmy", "joe"];
var LEET2 = { "0": "O", "1": "I", "2": "Z", "3": "E", "4": "A", "5": "S", "6": "G", "7": "T", "8": "B", "9": "G", "@": "A", "$": "S", "!": "I", "+": "T" };
var BLOCKLIST2 = ["NIGGER", "NIGGA", "NEGER", "COON", "SPIC", "KIKE", "CHINK", "GOOK", "WETBACK", "PAKI", "RAGHEAD", "TOWELHEAD", "JIGABOO", "TARBABY", "GOLLIWOG", "DARKIE", "FAGGOT", "FAG", "TRANNY", "DYKE", "RETARD", "SPAZ", "FUCK", "SHIT", "CUNT", "BITCH", "ASSHOLE", "WANKER", "TWAT", "PRICK", "COCK", "DICK", "PUSSY", "WHORE", "SLUT", "BASTARD", "PISS", "TITS", "BOLLOCK", "HITLER", "NAZI", "KKK", "RAPIST", "RAPE", "PEDO", "PAEDO"];
function nameOK(s) {
  const up = String(s).toUpperCase();
  let flat = "";
  for (const ch of up) flat += LEET2[ch] || ch;
  flat = flat.replace(/[^A-Z]/g, "");
  return !BLOCKLIST2.some((b) => flat.includes(b));
}
__name(nameOK, "nameOK");
function cleanText(raw, max) {
  return String(raw || "").replace(/[^\w .\-'!?]/g, "").trim().slice(0, max);
}
__name(cleanText, "cleanText");
async function listFaces(env, status) {
  const out = [];
  let cursor;
  do {
    const page = await env.PLAYS.list({ prefix: "face:", cursor });
    for (const k of page.keys) {
      const raw = await env.PLAYS.get(k.name);
      if (!raw) continue;
      try {
        const f = JSON.parse(raw);
        if (f.status === status) out.push(f);
      } catch (e) {
      }
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  out.sort((a, b) => (b.created || 0) - (a.created || 0));
  return out.slice(0, 200);
}
__name(listFaces, "listFaces");
async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (request.method === "OPTIONS") return new Response(null, { headers: cors });
  if (!env.PLAYS) return new Response(JSON.stringify({ ok: false, error: "no storage" }), { status: 503, headers: cors });
  if (request.method === "GET") {
    const status = url.searchParams.get("status") || "keeps";
    if (!VALID_STATUS.includes(status)) return new Response(JSON.stringify({ ok: false, error: "bad status" }), { status: 400, headers: cors });
    if ((status === "pending" || status === "deleted") && url.searchParams.get("token") !== env.FACELAB_MOD_TOKEN) {
      return new Response(JSON.stringify({ ok: false, error: "unauthorised" }), { status: 403, headers: cors });
    }
    const faces = await listFaces(env, status);
    return new Response(JSON.stringify({ ok: true, faces }), { headers: cors });
  }
  if (request.method === "POST") {
    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ ok: false, error: "bad json" }), { status: 400, headers: cors });
    }
    const agent = String(body.agent || "").toLowerCase();
    if (!AGENTS.includes(agent)) return new Response(JSON.stringify({ ok: false, error: "bad agent" }), { status: 400, headers: cors });
    const name = cleanText(body.name, 28);
    const author = cleanText(body.author, 16);
    if (!name || name.length < 2) return new Response(JSON.stringify({ ok: false, error: "name the expression (2+ chars)" }), { status: 400, headers: cors });
    if (!author || author.length < 2) return new Response(JSON.stringify({ ok: false, error: "add your name (2+ chars)" }), { status: 400, headers: cors });
    if (!nameOK(name) || !nameOK(author)) return new Response(JSON.stringify({ ok: false, error: "name rejected" }), { status: 400, headers: cors });
    const dots = Array.isArray(body.dots) ? body.dots : null;
    if (!dots || dots.length < 8) return new Response(JSON.stringify({ ok: false, error: "draw something first (8+ dots)" }), { status: 400, headers: cors });
    if (dots.length > MAX_DOTS) return new Response(JSON.stringify({ ok: false, error: "too many dots" }), { status: 400, headers: cors });
    const clean = [];
    const seen = /* @__PURE__ */ new Set();
    for (const d of dots) {
      if (!Array.isArray(d) || d.length !== 2) continue;
      const r = d[0] | 0, c = d[1] | 0;
      if (r < 0 || r >= GRID || c < 0 || c >= GRID) continue;
      const key = r * GRID + c;
      if (seen.has(key)) continue;
      seen.add(key);
      clean.push([r, c]);
    }
    if (clean.length < 8) return new Response(JSON.stringify({ ok: false, error: "draw something first" }), { status: 400, headers: cors });
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const face = { id, agent, name, author, dots: clean, status: "pending", created: Date.now() };
    await env.PLAYS.put(`face:${id}`, JSON.stringify(face));
    return new Response(JSON.stringify({ ok: true, id }), { headers: cors });
  }
  return new Response(JSON.stringify({ ok: false, error: "method" }), { status: 405, headers: cors });
}
__name(onRequest, "onRequest");

// ../.wrangler/tmp/pages-UyJMHg/functionsRoutes-0.8750999164097111.mjs
var routes = [
  {
    routePath: "/api/faces/moderate",
    mountPath: "/api/faces",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost]
  },
  {
    routePath: "/api/brightside-config",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet]
  },
  {
    routePath: "/api/brightside-submissions",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet2]
  },
  {
    routePath: "/api/brightside-submit",
    mountPath: "/api",
    method: "OPTIONS",
    middlewares: [],
    modules: [onRequestOptions]
  },
  {
    routePath: "/api/brightside-submit",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost2]
  },
  {
    routePath: "/api/plays",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet3]
  },
  {
    routePath: "/api/plays",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost3]
  },
  {
    routePath: "/api/scores",
    mountPath: "/api",
    method: "GET",
    middlewares: [],
    modules: [onRequestGet4]
  },
  {
    routePath: "/api/scores",
    mountPath: "/api",
    method: "POST",
    middlewares: [],
    modules: [onRequestPost4]
  },
  {
    routePath: "/api/faces",
    mountPath: "/api",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
