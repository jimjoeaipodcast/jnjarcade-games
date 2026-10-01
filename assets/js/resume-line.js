/* JnJ presence: finish Jimmy's line on whichever page you land on ───────────────────
   Osimo 2026-09-20: "you are forcing people to stay on the landing page till Jimmy said
   what he has to say. Rather I would let people move around but whatever Jimmy starts
   saying follows you till completion... regardless of where you move to." site-ambience.js
   (index.html/patreon.html) stashes {file, t} into sessionStorage the instant a same-tab
   link is clicked mid-line, then lets the click through with nothing held up. This is the
   other half: on load here, pick that stash up and finish the SAME line from the SAME
   point, once, then get out of the way. sessionStorage (not localStorage) so it can only
   ever fire for the tab that was actually mid-sentence, never a stale value from days ago
   or a different tab. Loaded on arcade.html, cinema.html, patreon-arcade.html,
   patreon-cinema.html — the four pages a landing-page card can actually go to. */
(function () {
  'use strict';
  var MUTE_KEY = 'jnj_landing_muted', RESUME_KEY = 'jnj_resume_line';
  if (localStorage.getItem(MUTE_KEY) === '1') { try { sessionStorage.removeItem(RESUME_KEY); } catch (e) {} return; }
  var raw;
  try { raw = sessionStorage.getItem(RESUME_KEY); } catch (e) { return; }
  if (!raw) return;
  try { sessionStorage.removeItem(RESUME_KEY); } catch (e) {}
  var stash;
  try { stash = JSON.parse(raw); } catch (e) { return; }
  if (!stash || !stash.file || !(stash.t >= 0)) return;
  window.__resumeLineQA = { stash: stash, playing: false, error: null };

  // Same latch shape as site-ambience.js's own greeter, same reason: `done` is set
  // SYNCHRONOUSLY at call-start (blocking a pointerdown-triggered duplicate while the
  // immediate cold-load attempt is still in flight) and reset on rejection (a promise
  // rejection resolves faster than any real human gesture can follow, so by the time a
  // genuine pointerdown fires, a blocked cold attempt has already released the latch and
  // the fallback gets a clean real attempt — never two overlapping Audio instances).
  var done = false;
  function resume() {
    if (done) return;
    done = true;
    try {
      var line = new Audio('/assets/audio/site/' + stash.file + '.mp3?v=1');
      line.volume = 0.9;
      var seek = function () {
        try { line.currentTime = stash.t; } catch (e) {}
        line.play().then(function () { window.__resumeLineQA.playing = true; })
          .catch(function (err) { done = false; window.__resumeLineQA.error = String(err); });
      };
      if (line.readyState >= 1) seek();
      else line.addEventListener('loadedmetadata', seek, { once: true });
    } catch (e) { done = false; window.__resumeLineQA.error = String(e); }
  }
  // Same autoplay-with-sound rule as site-ambience.js's own greeter: try immediately for
  // contexts that allow it, first-gesture fallback for the cold-load case every normal
  // visitor actually is (they just came from a click, but THIS document hasn't had one yet).
  resume();
  document.addEventListener('pointerdown', resume, { once: true, passive: true });
})();
