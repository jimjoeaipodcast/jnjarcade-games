/* ── JnJ presence: rotating Jimmy greeter + background loop ────────────────────
   Shared by index.html AND patreon.html (Osimo 2026-09-08: "ensure the Jimmy Joe
   dialogues are on those two landing pages") — pulled out of index.html's own inline
   copy into one file the moment a second page needed the identical behaviour, so the
   two can't drift out of sync the way a duplicated inline block eventually would.
   NOT part of app.js on purpose: app.js drives the 5 CABINET HALLS
   (JNJARCADE_SITE_BIBLE.md); this is the 2 LANDING/HUB pages, a different set, and
   keeping it separate means editing this can't touch a single hall page.

   Music bed is assets/audio/site/arcade-loop.mp3 (wired 2026-09-09 — the file existed on
   disk since 2026-09-08 but nothing pointed at it; the landing-loop.mp3 name below was a
   placeholder that 404s, silently caught by music.onerror).

   Osimo 2026-09-08: "the jingle starts automatically as you open the arcade" — tries
   play() immediately on load for whichever browsers allow it (repeat visitors, PWA
   contexts, etc.), but no browser lets JS force audible autoplay on a cold visit with
   zero interaction — that's a platform rule, not something any site can override — so
   first-pointerdown is kept as the real fallback path every visitor actually gets.

   Osimo 2026-09-09: "Jimmy didn't speak" on a cold visit — root cause was `started` being
   set true by the FIRST (blocked, cold-load) attempt regardless of whether play() actually
   succeeded, so the real pointerdown-driven retry saw started===true and silently no-opped
   every single time. Every normal first-time visitor hit this; only repeat visitors whose
   browser allows real autoplay (Media Engagement Index, installed PWA) ever heard a line.
   Fixed by only latching `started` once the line's play() promise actually resolves, and
   clearing it on rejection so the next real gesture gets a real attempt.

   Osimo 2026-09-20: "if I quickly enter the arcade or cinema it cuts off Jimmy mid
   sentence... let him finish." First attempt held the navigation itself open until the
   line ended — Osimo, next message: "you are forcing people to stay on the landing page
   till Jimmy said what he has to say. Rather I would let people move around but whatever
   Jimmy starts saying follows you till completion... regardless of where you move to."
   Right call — blocking the tap was the wrong fix for "don't cut him off". Real fix: let
   the click through immediately, but stash which line + how far into it in
   sessionStorage (survives a real navigation, same tab only) right before the browser
   tears this page down. assets/js/resume-line.js — loaded on arcade.html/cinema.html and
   their patreon twins — picks that up on the NEXT page and plays the rest of the same
   line from that exact point, so Jimmy's sentence finishes on whichever screen you
   actually land on instead of holding you here to hear it out. */
(function () {
  'use strict';
  var MUTE_KEY = 'jnj_landing_muted', IDX_KEY = 'jnj_landing_line_idx';
  var LINES = [
    'landing-01', 'landing-02', 'landing-03', 'landing-04',
    'landing-05', 'landing-06', 'landing-07', 'landing-08',
    // Osimo 2026-09-20: "add ten more funny quotes by Jimmy to the repertoire" — same
    // register as the original 8 (transcribed them first to match: short, deadpan, self-
    // aware about the site/arcade/cinema existing, Joe named but never voiced).
    'landing-09', 'landing-10', 'landing-11', 'landing-12', 'landing-13',
    'landing-14', 'landing-15', 'landing-16', 'landing-17', 'landing-18',
  ];
  var RESUME_KEY = 'jnj_resume_line';   // read by resume-line.js on the page you land on
  var btn = document.getElementById('ambMute');
  var muted = localStorage.getItem(MUTE_KEY) === '1';
  var music = null, started = false, currentLine = null, currentLineFile = null;

  function paintBtn() { if (btn) btn.innerHTML = muted ? '&#128263;' : '&#128266;'; }
  paintBtn();

  function ensureMusic() {
    if (music) return music;
    music = new Audio('assets/audio/site/arcade-loop.mp3?v=1');
    music.loop = true; music.volume = 0.15; music.preload = 'none';
    music.onerror = function () { music = null; };
    return music;
  }

  function nextLineFile() {
    var i = parseInt(localStorage.getItem(IDX_KEY) || '0', 10);
    if (!(i >= 0 && i < LINES.length)) i = 0;
    localStorage.setItem(IDX_KEY, String((i + 1) % LINES.length));
    return LINES[i];
  }

  function startPresence() {
    if (started || muted) return;
    started = true;
    try { ensureMusic().play().catch(function () {}); } catch (e) {}
    try {
      var file = nextLineFile();
      var line = new Audio('assets/audio/site/' + file + '.mp3?v=1');
      line.volume = 0.9;
      currentLine = line; currentLineFile = file;
      line.addEventListener('ended', function () {
        if (currentLine === line) { currentLine = null; currentLineFile = null; }
      });
      // The cold-load call below this function is blocked on every normal first visit —
      // that's an unavoidable platform rule, not a bug — so `started` must only latch once
      // playback actually starts. Left eager, the blocked cold attempt poisoned the flag and
      // the real pointerdown-driven retry (the fallback every visitor gets) saw started
      // already true and silently did nothing — Jimmy never spoke for a single first-time
      // visitor, only for the rare repeat visit a browser lets autoplay through for.
      line.play().catch(function () { started = false; currentLine = null; });
    } catch (e) { started = false; }
  }

  // Try the moment the page is ready — works for browsers/contexts that allow it
  // (Media Engagement Index on repeat visitors, an installed PWA, etc.).
  if (!muted) startPresence();
  // The real fallback: every visitor gets this, since a cold-load autoplay attempt
  // with sound is blocked by every major browser without exception.
  document.addEventListener('pointerdown', startPresence, { once: true, passive: true });

  window.__siteAmbienceQA = function () {
    return { currentLineFile: currentLineFile,
             playing: !!(currentLine && !currentLine.paused && !currentLine.ended),
             duration: currentLine ? currentLine.duration : null,
             currentTime: currentLine ? currentLine.currentTime : null };
  };

  // "let him finish" — NOT by holding the tap: stash where the line is, let navigation go
  // through immediately, resume-line.js finishes it on whichever page you land on. Capture
  // phase only so this runs before anything else, never to block the click itself.
  document.addEventListener('click', function (e) {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;   // new-tab/window gestures — untouched
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || a.target === '_blank' || a.hasAttribute('download')) return;
    var href = a.getAttribute('href');
    if (!href || href.charAt(0) === '#') return;
    var line = currentLine;
    if (!line || line.paused || line.ended || !currentLineFile) return;   // nothing playing — nothing to hand off
    var remainingMs = (line.duration - line.currentTime) * 1000;
    if (!isFinite(remainingMs) || remainingMs <= 150) return;   // essentially done already
    // Osimo 2026-09-20: "Jimmy repeats one word twice as you change page" — real navigation
    // doesn't tear the old page down the instant this click handler runs, it tears it down
    // after the browser finishes processing the click and starts unloading the document —
    // audio keeps playing through that gap. The stashed currentTime was read BEFORE that gap,
    // so resuming from it replayed however much he'd actually gone on to say in the meantime.
    // GAP_SEC is a deliberate over-estimate of that handoff time — a small forward skip on
    // resume reads as nothing; a repeated word is the thing actually being fixed here.
    var GAP_SEC = 0.22;
    var t = line.currentTime + GAP_SEC;
    if (isFinite(line.duration)) t = Math.min(t, line.duration - 0.05);
    try {
      sessionStorage.setItem(RESUME_KEY, JSON.stringify({ file: currentLineFile, t: t }));
    } catch (err) {}
    // let the click proceed as normal — no preventDefault, navigation is never held up
  }, true);

  if (btn) btn.addEventListener('click', function () {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    paintBtn();
    if (muted) { if (music) music.pause(); }
    else { started = true; ensureMusic().play().catch(function () {}); }
  });
})();
