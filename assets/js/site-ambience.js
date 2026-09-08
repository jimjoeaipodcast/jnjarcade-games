/* ── JnJ presence: rotating Jimmy greeter + background loop ────────────────────
   Shared by index.html AND patreon.html (Osimo 2026-09-08: "ensure the Jimmy Joe
   dialogues are on those two landing pages") — pulled out of index.html's own inline
   copy into one file the moment a second page needed the identical behaviour, so the
   two can't drift out of sync the way a duplicated inline block eventually would.
   NOT part of app.js on purpose: app.js drives the 5 CABINET HALLS
   (JNJARCADE_SITE_BIBLE.md); this is the 2 LANDING/HUB pages, a different set, and
   keeping it separate means editing this can't touch a single hall page.

   Music file is Osimo's own pick (still not supplied) — points at
   assets/audio/site/landing-loop.mp3, 404s silently until it exists.

   Osimo 2026-09-08: "the jingle starts automatically as you open the arcade" — tries
   play() immediately on load for whichever browsers allow it (repeat visitors, PWA
   contexts, etc.), but no browser lets JS force audible autoplay on a cold visit with
   zero interaction — that's a platform rule, not something any site can override — so
   first-pointerdown is kept as the real fallback path every visitor actually gets. */
(function () {
  'use strict';
  var MUTE_KEY = 'jnj_landing_muted', IDX_KEY = 'jnj_landing_line_idx';
  var LINES = [
    'landing-01', 'landing-02', 'landing-03', 'landing-04',
    'landing-05', 'landing-06', 'landing-07', 'landing-08',
  ];
  var btn = document.getElementById('ambMute');
  var muted = localStorage.getItem(MUTE_KEY) === '1';
  var music = null, started = false;

  function paintBtn() { if (btn) btn.innerHTML = muted ? '&#128263;' : '&#128266;'; }
  paintBtn();

  function ensureMusic() {
    if (music) return music;
    music = new Audio('assets/audio/site/landing-loop.mp3?v=1');
    music.loop = true; music.volume = 0.15; music.preload = 'none';
    music.onerror = function () { music = null; }; // Osimo's lounge file isn't dropped in yet
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
      var line = new Audio('assets/audio/site/' + nextLineFile() + '.mp3?v=1');
      line.volume = 0.9;
      line.play().catch(function () {});
    } catch (e) {}
  }

  // Try the moment the page is ready — works for browsers/contexts that allow it
  // (Media Engagement Index on repeat visitors, an installed PWA, etc.).
  if (!muted) startPresence();
  // The real fallback: every visitor gets this, since a cold-load autoplay attempt
  // with sound is blocked by every major browser without exception.
  document.addEventListener('pointerdown', startPresence, { once: true, passive: true });

  if (btn) btn.addEventListener('click', function () {
    muted = !muted;
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    paintBtn();
    if (muted) { if (music) music.pause(); }
    else { started = true; ensureMusic().play().catch(function () {}); }
  });
})();
