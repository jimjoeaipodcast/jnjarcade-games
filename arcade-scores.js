/* JnJ Arcade — global hi-score board, drawn as a real arcade cabinet. v10 */
/* JnJ Arcade — global hi-score board, drawn as a real arcade cabinet.
   Usage (from a game's end screen):
     ArcadeScores.show({ game: 'snake', title: 'SNAKE BLASTER', score: 1234,
                         accent: '#5af23a', onClose: () => {...} });
   Flow: enter name (filtered) → submit → "YOU RANKED #N" with your row
   highlighted in a scrollable board. Falls back to a local-only board
   until the global API has storage.

   Usage (from a cassette's HI-SCORE tap on the arcade listing page — no
   score to submit, just browsing):
     ArcadeScores.showBoard({ game: 'snake', title: 'SNAKE BLASTER',
                              accent: '#5af23a', onClose: () => {...} });
   No name entry, no rank line, no auto-redirect-away ticker — CLOSE just
   removes the overlay and returns to whatever page you were already on. */

(function () {
'use strict';

/* same normalisation + blocklist as the server (client = instant feedback) */
var LEET = { '0':'O','1':'I','2':'Z','3':'E','4':'A','5':'S','6':'G','7':'T','8':'B','9':'G','@':'A','$':'S','!':'I','+':'T' };
var BLOCK = ['NIGGER','NIGGA','NEGER','COON','SPIC','KIKE','CHINK','GOOK','WETBACK',
  'PAKI','RAGHEAD','TOWELHEAD','JIGABOO','TARBABY','GOLLIWOG','DARKIE',
  'FAGGOT','FAG','TRANNY','DYKE','RETARD','SPAZ',
  'FUCK','SHIT','CUNT','BITCH','ASSHOLE','WANKER','TWAT','PRICK','COCK',
  'DICK','PUSSY','WHORE','SLUT','BASTARD','PISS','TITS','BOLLOCK',
  'HITLER','NAZI','KKK','RAPIST','RAPE','PEDO','PAEDO'];

function returnUrl() {
  /* Where the player came FROM. Both exits were hardcoded to '/', so finishing a game
     launched from /patreon or /arcade dumped you on the main arcade (Osimo 2026-07-29:
     "it should kick you back out to the main patreon arcade"). app.js stamps the
     launching page on click; referrer is the fallback for a direct hit.
     localStorage, NOT sessionStorage (Osimo 2026-08-02) — see the matching comment in
     app.js's play-click handler for why sessionStorage was the live suspect. */
  try {
    var v = localStorage.getItem('jnj_return');
    if (v && v.charAt(0) === '/') return v;
  } catch (e) {}
  try {
    if (document.referrer) {
      var u = new URL(document.referrer);
      if (u.origin === location.origin && u.pathname.indexOf('/games/') !== 0) return u.pathname;
    }
  } catch (e) {}
  return '/';
}

/* Remember the player's initials across games (Osimo 2026-08-05: "once they have written
   their name once allow the next game/scoreboard to be prefilled with the same name so
   they don't have to type it again").
   localStorage, NOT sessionStorage — same reason as jnj_return above: iOS fullscreen nav
   and Add-to-Home-Screen silently drop sessionStorage, and this has to survive moving
   between cabinets, which is the entire point. */
/* INSTALLED-APP FULLSCREEN GUARD — Osimo 2026-08-18: "remove that exit full screen message
   from all games... if installed as a full screen app it shouldn't show the address bar ever
   once in the app and stay in full screen mode at all times."

   That banner is NOT ours — it is Android Chrome's own "swipe down to exit full screen"
   toast, fired whenever a page calls requestFullscreen(). We cannot style or dismiss it.
   What we CAN do is stop asking: the installed PWA already runs display:fullscreen, so
   every requestFullscreen() call inside it is redundant AND is the thing summoning the
   toast. Seventeen games call it individually, so the guard lives here — this file is
   loaded by every one of them (verified: 0 games call requestFullscreen without it), which
   makes it one edit instead of seventeen chances to break a game.

   In a normal browser tab nothing changes: the call goes through exactly as before. */
(function () {
  function installedFullscreen() {
    try {
      return window.matchMedia('(display-mode: fullscreen)').matches ||
             window.matchMedia('(display-mode: standalone)').matches ||
             navigator.standalone === true;
    } catch (e) { return false; }
  }
  // Patch EVERY vendor spelling, not just the standard one — a half-patched API is worse
  // than none, because the unpatched path still fires the toast and looks like a fluke.
  ['requestFullscreen', 'webkitRequestFullscreen', 'mozRequestFullScreen', 'msRequestFullscreen']
    .forEach(function (fn) {
      var orig = Element.prototype[fn];
      if (!orig) return;
      Element.prototype[fn] = function () {
        if (installedFullscreen()) return Promise.resolve();   // already fullscreen: no-op, no toast
        try { return orig.apply(this, arguments); } catch (e) { return Promise.resolve(); }
      };
    });
})();

var NAME_KEY = 'jnj_arcade_name';
// How long a score POST may stall before we give up and bank it locally instead. Long
// enough that a merely-slow mobile connection still submits for real, short enough that a
// dead one doesn't strand the player on a disabled button.
var SUBMIT_TIMEOUT_MS = 6000;
function savedName() {
  try { return (localStorage.getItem(NAME_KEY) || '').toUpperCase(); } catch (e) { return ''; }
}
function rememberName(n) {
  try { localStorage.setItem(NAME_KEY, String(n).toUpperCase()); } catch (e) {}
}

function nameAllowed(name) {
  var up = String(name).toUpperCase(), flat = '';
  for (var i = 0; i < up.length; i++) flat += LEET[up[i]] || up[i];
  flat = flat.replace(/[^A-Z]/g, '');
  return !BLOCK.some(function (b) { return flat.indexOf(b) !== -1; });
}

var CSS = `
#as-root { position: fixed; inset: 0; z-index: 9000; display: flex;
  align-items: flex-start; justify-content: center;
  background: radial-gradient(ellipse 90% 70% at 50% 110%, rgba(60,40,20,0.35), transparent 60%), #060403;
  font-family: 'Barlow Condensed','Arial Narrow',sans-serif;
  touch-action: manipulation; }
#as-root * { box-sizing: border-box; margin: 0; padding: 0; }

/* the cabinet fills the view; the control deck at the bottom edge is
   what sells "standing at a real machine" */
.as-cab { width: min(94vw, 460px); height: 100dvh; display: flex; flex-direction: column;
  background: linear-gradient(90deg, #0c0805 0 4%, #1a120a 4% 7%, #120c07 7% 93%, #1a120a 93% 96%, #0c0805 96%);
  border-left: 10px solid #070402; border-right: 10px solid #070402;
  box-shadow: 0 0 80px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.6); }

.as-marquee { flex: 0 0 auto; text-align: center;
  padding: calc(env(safe-area-inset-top, 0px) + 28px) 10px 12px;
  background: linear-gradient(#241608, #120a04);
  border-bottom: 6px solid #070402;
  font-family: 'Bungee', cursive; font-size: clamp(17px, 5vw, 24px);
  letter-spacing: 0.14em; color: var(--as-accent);
  text-shadow: 0 0 18px var(--as-glow), 0 0 5px var(--as-accent); }

.as-bezel { flex: 1 1 auto; min-height: 0; margin: 12px 16px;
  background: #050302; border-radius: 18px; padding: 14px;
  box-shadow: inset 0 0 0 3px #000, inset 0 8px 30px rgba(0,0,0,0.9); }

.as-crt { position: relative; width: 100%; height: 100%; overflow: hidden;
  background: #030503; border-radius: 10px;
  box-shadow: inset 0 0 60px rgba(0,0,0,0.8), 0 0 26px -8px var(--as-glow); }
.as-crt::after { content: ''; position: absolute; inset: 0; pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(0,0,0,0.22) 0 1px, transparent 1px 3px),
    radial-gradient(ellipse 120% 90% at 50% -20%, rgba(255,255,255,0.06), transparent 50%); }

.as-screen { position: absolute; inset: 0; display: flex; flex-direction: column;
  padding: 16px 14px; color: var(--as-accent); }
.as-h1 { font-family: 'Bungee', cursive; font-size: clamp(15px, 4.4vw, 20px);
  letter-spacing: 0.22em; text-align: center; animation: as-blink 1.4s steps(1) infinite; }
@keyframes as-blink { 0%, 75% { opacity: 1; } 76%, 100% { opacity: 0.35; } }
.as-sub { text-align: center; font-weight: 700; font-size: 15px; letter-spacing: 0.14em;
  color: #f2e9d8; opacity: 0.8; margin-top: 8px; }
.as-score-big { text-align: center; font-weight: 800; font-size: clamp(34px, 10vw, 48px);
  color: #f2e9d8; margin: 10px 0 2px; font-variant-numeric: tabular-nums; }

.as-entry { display: flex; flex-direction: column; align-items: center; gap: 14px; margin-top: 4vh; }
.as-input { width: min(70%, 240px); background: transparent; border: none;
  border-bottom: 3px solid var(--as-accent); outline: none; text-align: center;
  font-family: 'Bungee', cursive; font-size: clamp(20px, 6vw, 26px);
  letter-spacing: 0.3em; color: #f2e9d8; text-transform: uppercase;
  caret-color: var(--as-accent); padding: 6px 0; border-radius: 0;
  /* games set user-select:none on body — iOS refuses focus unless the
     input opts back in */
  -webkit-user-select: text; user-select: text; touch-action: auto;
  -webkit-appearance: none; appearance: none; }
.as-err { font-weight: 800; font-size: 14px; letter-spacing: 0.12em; color: #ff5a5a;
  min-height: 18px; }
.as-btn { font-family: 'Bungee', cursive; font-size: 15px; color: #060403;
  background: var(--as-accent); border: none; border-radius: 10px;
  padding: 14px 34px 11px; cursor: pointer;
  box-shadow: 0 5px 0 rgba(0,0,0,0.6); -webkit-tap-highlight-color: transparent; }
.as-btn:active:not(:disabled) { transform: translateY(4px); box-shadow: 0 1px 0 rgba(0,0,0,0.6); }
/* An in-flight submit MUST look different from a live button. Osimo 2026-08-21: "had to
   press submit score 4 times" — doSubmit() disabled the button but changed nothing you
   could see (no :disabled rule existed at all, and the label stayed "SUBMIT SCORE"), so a
   slow POST was indistinguishable from a dead button and the only sane reaction was to
   tap again. Reproduced headlessly: fast API = 1 tap, 4s API = 6 taps, hanging API = never. */
.as-btn:disabled { opacity: 0.55; cursor: default; box-shadow: 0 5px 0 rgba(0,0,0,0.35); }
.as-skip { background: none; border: none; color: #b8ad97; font-weight: 700;
  font-size: 13px; letter-spacing: 0.2em; cursor: pointer; padding: 8px; }

.as-rank { text-align: center; font-family: 'Bungee', cursive;
  font-size: clamp(16px, 5vw, 22px); color: #ffd23d; margin: 8px 0 10px;
  text-shadow: 0 0 16px rgba(255,210,61,0.5); }
.as-list { flex: 1 1 auto; overflow-y: auto; -webkit-overflow-scrolling: touch;
  margin-top: 6px; scrollbar-width: thin; }
.as-row { display: flex; gap: 10px; padding: 7px 8px; font-size: clamp(15px, 4.2vw, 18px);
  font-weight: 700; letter-spacing: 0.1em; color: #cfe8c0; font-variant-numeric: tabular-nums; }
.as-row .r { width: 3.2em; opacity: 0.7; }
.as-row .n { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.as-row .s { text-align: right; }
.as-row.me { background: var(--as-accent); color: #060403; border-radius: 6px;
  animation: as-mepulse 1.2s ease-in-out infinite; }
@keyframes as-mepulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.25); } }
.as-empty { text-align: center; font-weight: 700; letter-spacing: 0.14em;
  color: #b8ad97; margin-top: 30px; line-height: 2; }
.as-note { text-align: center; font-weight: 700; font-size: 11px; letter-spacing: 0.18em;
  color: #b8ad97; opacity: 0.7; padding-top: 6px; }

/* control deck along the bottom edge — exit button lives here */
.as-deck { flex: 0 0 auto; min-height: 84px;
  background: linear-gradient(#1a120a, #0c0805);
  border-top: 6px solid #070402; display: flex; align-items: center;
  justify-content: center;
  padding: 14px 10px calc(env(safe-area-inset-bottom, 0px) + 14px); }
.as-back { font-family: 'Bungee', cursive; font-size: 14px;
  letter-spacing: 0.1em; color: #060403; background: var(--as-accent);
  border: none; border-radius: 10px; padding: 13px 28px 10px; cursor: pointer;
  box-shadow: 0 5px 0 rgba(0,0,0,0.6); -webkit-tap-highlight-color: transparent; }
.as-back:active { transform: translateY(4px); box-shadow: 0 1px 0 rgba(0,0,0,0.6); }

@media (prefers-reduced-motion: reduce) { .as-h1, .as-row.me { animation: none; } }
`;

function el(tag, cls, text) {
  var e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function localKey(game) { return 'jnj_board_' + game; }

function localScores(game) {
  try { return JSON.parse(localStorage.getItem(localKey(game)) || '[]'); }
  catch (e) { return []; }
}

function saveLocal(game, entry) {
  var list = localScores(game);
  list.push(entry);
  list.sort(function (a, b) { return b.s - a.s || a.t - b.t; });
  if (list.length > 100) list.length = 100;
  try { localStorage.setItem(localKey(game), JSON.stringify(list)); } catch (e) {}
  return { rank: list.indexOf(entry) + 1, total: list.length, scores: list };
}

function show(opts) {
  var game = opts.game, score = Math.max(0, Math.floor(opts.score || 0));
  var accent = opts.accent || '#5af23a';
  var glow = accent + '55';

  if (!document.getElementById('as-style')) {
    var st = el('style'); st.id = 'as-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  var old = document.getElementById('as-root');
  if (old) old.remove();

  var root = el('div'); root.id = 'as-root';
  root.style.setProperty('--as-accent', accent);
  root.style.setProperty('--as-glow', glow);

  var cab = el('div', 'as-cab');
  cab.appendChild(el('div', 'as-marquee', (opts.title || game).toUpperCase() + ' · HI-SCORES'));

  var bezel = el('div', 'as-bezel');
  var crt = el('div', 'as-crt');
  var screen = el('div', 'as-screen');
  crt.appendChild(screen); bezel.appendChild(crt); cab.appendChild(bezel);

  var deck = el('div', 'as-deck');
  var backBtn = el('button', 'as-back', 'BACK TO ARCADE');
  backBtn.addEventListener('click', function () { window.location.href = returnUrl(); });
  deck.appendChild(backBtn);
  cab.appendChild(deck);

  root.appendChild(cab);
  document.body.appendChild(root);

  // Osimo 2026-08-01: the cabinet used to just snap onto the screen. gsap may be
  // absent (CDN blocked/offline) or the player may have reduced-motion set —
  // both degrade cleanly to the original instant-appear behavior.
  var motionOK = typeof gsap !== 'undefined' &&
    !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (motionOK) gsap.fromTo(cab, {opacity: 0, y: 24}, {opacity: 1, y: 0, duration: .4, ease: 'power2.out'});

  // Set by renderEntry()'s keyboard-lift listener; close() tears it down so it doesn't
  // outlive the modal (iOS Safari fires visualViewport resize far more often than Android
  // Chrome — a leaked listener per game-over compounds into iPhone-only jank over a session).
  var vvResizeHandler = null;
  function close() {
    if (vvResizeHandler) { window.visualViewport.removeEventListener('resize', vvResizeHandler); vvResizeHandler = null; }
    root.remove(); if (opts.onClose) opts.onClose();
  }

  /* ── phase 1: name entry ── */
  function renderEntry() {
    screen.innerHTML = '';
    screen.appendChild(el('div', 'as-h1', 'ENTER YOUR NAME'));
    var scoreEl = el('div', 'as-score-big', motionOK ? '0' : score.toLocaleString('en-GB'));
    screen.appendChild(scoreEl);
    screen.appendChild(el('div', 'as-sub', 'YOUR SCORE'));
    // Classic arcade score count-up instead of the number just appearing whole.
    if (motionOK) {
      gsap.to({v: 0}, {
        v: score, duration: Math.min(1.4, .3 + score / 2000), ease: 'power1.out',
        onUpdate: function () { scoreEl.textContent = Math.round(this.targets()[0].v).toLocaleString('en-GB'); },
      });
    }

    var entry = el('div', 'as-entry');
    var input = el('input', 'as-input');
    input.type = 'text'; input.maxLength = 3; input.placeholder = 'AAA';
    input.autocapitalize = 'characters'; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('enterkeyhint', 'done');
    input.setAttribute('autocorrect', 'off');
    // Tell every autofill engine this is not a saveable field (Osimo 2026-08-02, Android
    // installed-app: Chrome docked its autofill strip — key/card/location icons — directly
    // over the input, so he couldn't see what he was typing). autocomplete="off" alone is
    // routinely ignored; the name/id and vendor opt-outs kill the heuristics that trigger it.
    input.setAttribute('name', 'jnj-arcade-initials');
    input.id = 'jnj-arcade-initials';
    input.setAttribute('data-form-type', 'other');
    input.setAttribute('data-lpignore', 'true');    // LastPass
    input.setAttribute('data-1p-ignore', 'true');   // 1Password
    input.setAttribute('data-bwignore', 'true');    // Bitwarden
    var err = el('div', 'as-err', '');
    // Three buttons (Osimo 2026-08-19): SUBMIT SCORE / PLAY AGAIN / ARCADE.
    // PLAY AGAIN = close -> onClose -> the cabinet's own restart (what SKIP used
    // to do, but says what it does). ARCADE = back to the hall that launched this
    // cabinet (same returnUrl the score-board exit already uses).
    var submit = el('button', 'as-btn', 'SUBMIT SCORE');
    var playAgain = el('button', 'as-btn', 'PLAY AGAIN');
    var toArcade = el('button', 'as-skip', 'ARCADE');

    entry.appendChild(input); entry.appendChild(err);
    entry.appendChild(submit); entry.appendChild(playAgain); entry.appendChild(toArcade);
    screen.appendChild(entry);
    // Prefill from the last cabinet. SELECT rather than just place the caret: the whole
    // value is highlighted, so typing overwrites it instantly for anyone who wants a
    // different name, while the common case is now zero typing.
    var prior = savedName();
    if (prior) {
      input.value = prior;
      screen.querySelector('.as-h1').textContent = 'READY, ' + prior + '?';
    }
    // DO NOT focus when we already know the name. Osimo 2026-08-18: "if you already have
    // the name from the previous game don't prompt the keyboard to pop up, allow the user to
    // click submit score directly." Focusing raised the keyboard over a field that was
    // already correct, so the common path (same player, next cabinet) made you dismiss a
    // keyboard you never needed. Tapping the input still focuses it for anyone changing name.
    if (!prior) setTimeout(function () { input.focus(); }, 150);

    /* KEYBOARD-AWARE LIFT — the guaranteed half of the fix.
       Suppressing autofill is best-effort (browsers ignore hints at will), so don't rely
       on it: measure the ACTUAL visible area with visualViewport once the keyboard is up
       and lift the whole screen so the input clears both the keyboard and anything docked
       above it. Degrades to a no-op where visualViewport is absent (older WebKit). */
    var AUTOFILL_STRIP = 64;   // Chrome's docked autofill bar, measured on the report
    var vv = window.visualViewport;
    function liftForKeyboard() {
      if (!vv || !document.body.contains(input)) return;
      var safeH = vv.height - AUTOFILL_STRIP;
      if (safeH <= 0) return;
      var r = input.getBoundingClientRect();
      // put the input at ~40% of the usable height — comfortably above the strip, and
      // still low enough that the title/score stay on screen.
      var target = Math.max(12, Math.min(safeH * 0.40, safeH - r.height - 12));
      var shift = (r.top - target);
      screen.style.transition = 'transform .18s ease-out';
      screen.style.transform = shift > 4 ? 'translateY(' + (-shift) + 'px)' : '';
    }
    function dropLift() { screen.style.transform = ''; }
    input.addEventListener('focus', function () { setTimeout(liftForKeyboard, 260); });
    input.addEventListener('blur', dropLift);
    if (vv) {
      vvResizeHandler = function () {
        if (document.activeElement === input) liftForKeyboard();
      };
      vv.addEventListener('resize', vvResizeHandler);
    }

    function doSubmit() {
      var name = input.value.toUpperCase().replace(/[^A-Z0-9 .\-]/g, '').trim();
      if (name.length < 1) { err.textContent = 'ENTER YOUR INITIALS'; return; }
      if (!nameAllowed(name)) { err.textContent = 'NOT ON THIS CABINET. PICK ANOTHER.'; return; }
      // Say it's working. The disabled flag alone is invisible feedback — see the
      // .as-btn:disabled note in CSS for the bug this caused.
      submit.disabled = true; submit.textContent = 'SUBMITTING…'; err.textContent = '';
      rememberName(name);      // next cabinet prefills it
      function rearm() { submit.disabled = false; submit.textContent = 'SUBMIT SCORE'; }

      // Never dead-end on a stalled connection. Without this the promise simply never
      // settles: the button stays disabled forever and the score is lost with no way back
      // (reproduced — a hanging /api/scores left it stuck through every retry). On timeout
      // we take the same path as a failed request: bank the score locally and show the
      // board, so the run is never thrown away just because the network was down.
      var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, SUBMIT_TIMEOUT_MS);

      fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: game, name: name, score: score }),
        signal: ctl ? ctl.signal : undefined,
      }).then(function (r) {
        if (r.status === 422) { throw { handled: true, msg: 'NOT ON THIS CABINET. PICK ANOTHER.' }; }
        if (!r.ok) throw new Error('api ' + r.status);
        return r.json();
      }).then(function (data) {
        clearTimeout(timer);
        renderBoard(data.rank, data.scores, name, false);
      }).catch(function (e) {
        clearTimeout(timer);
        if (e && e.handled) { err.textContent = e.msg; rearm(); return; }
        var res = saveLocal(game, { n: name, s: score, t: Date.now() });
        renderBoard(res.rank, res.scores, name, true);
      });
    }
    submit.addEventListener('click', doSubmit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSubmit(); });
    playAgain.addEventListener('click', close);
    toArcade.addEventListener('click', function () { window.location.href = returnUrl(); });
  }

  /* ── phase 2: the board ── */
  function renderBoard(rank, scores, myName, localOnly) {
    screen.innerHTML = '';
    screen.style.transform = '';   // drop any keyboard lift from the name-entry phase
    screen.appendChild(el('div', 'as-h1', 'HI-SCORES'));
    screen.appendChild(el('div', 'as-rank', 'YOU RANKED #' + rank));

    var list = el('div', 'as-list');
    var meRow = null;
    if (!scores.length) {
      list.appendChild(el('div', 'as-empty', 'NO SCORES YET.\nTHIS CABINET IS ALL YOURS.'));
    }
    var claimed = false;
    scores.forEach(function (e, i) {
      var row = el('div', 'as-row');
      var mine = !claimed && (i + 1) === rank && e.n === myName && e.s === score;
      if (mine) { row.classList.add('me'); meRow = row; claimed = true; }
      row.appendChild(el('span', 'r', String(i + 1).padStart(3, ' ') + '.'));
      row.appendChild(el('span', 'n', e.n));
      row.appendChild(el('span', 's', Number(e.s).toLocaleString('en-GB')));
      list.appendChild(row);
    });
    screen.appendChild(list);
    screen.appendChild(el('div', 'as-note',
      localOnly ? 'LOCAL BOARD — GLOBAL SCORES COMING ONLINE' : 'GLOBAL BOARD — ALL PLAYERS'));

    /* Two ways out (Osimo 2026-08-05: "allow them to go back to the arcade or straight
       back into the game"). PLAY AGAIN uses the existing close() — it drops the overlay
       and calls opts.onClose, which every cabinet wires to its own reset, so the player
       is back in the game with no page load at all.
       The 3s auto-return stays as the cabinet default for someone who walks away, but any
       deliberate touch now CANCELS it outright rather than buying 3 more seconds: the old
       behaviour could still yank you to the arcade mid-decision, which is exactly the
       friction this change is meant to remove. */
    var choices = el('div', 'as-entry');
    var againBtn = el('button', 'as-btn', 'PLAY AGAIN');
    var arcadeBtn = el('button', 'as-skip', 'BACK TO ARCADE');
    choices.appendChild(againBtn); choices.appendChild(arcadeBtn);
    screen.appendChild(choices);

    var ticker = el('div', 'as-note', '');
    ticker.style.color = '#ffd23d';
    ticker.style.fontSize = '13px';
    screen.appendChild(ticker);

    var left = 3, timer = null, stopped = false;
    function stopTicker() {
      stopped = true;
      if (timer) { clearTimeout(timer); timer = null; }
      ticker.textContent = '';
    }
    function tick() {
      if (stopped) return;
      ticker.textContent = 'BACK TO THE ARCADE IN ' + left + '…';
      if (left <= 0) { window.location.href = returnUrl(); return; }
      left--;
      timer = setTimeout(tick, 1000);
    }
    tick();
    againBtn.addEventListener('click', function () { stopTicker(); close(); });
    arcadeBtn.addEventListener('click', function () {
      stopTicker(); window.location.href = returnUrl();
    });
    // Reading the board, or reaching for a button, means they are still here.
    ['touchstart', 'pointerdown'].forEach(function (ev) {
      screen.addEventListener(ev, stopTicker, { passive: true });
    });
    list.addEventListener('scroll', stopTicker, { passive: true });

    if (meRow) setTimeout(function () {
      meRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 250);
  }

  renderEntry();
}

/* ── view-only board (from a cassette's HI-SCORE tap — no name entry,
   no score to submit, closes back to the SAME page instead of navigating away) ── */
function showBoard(opts) {
  var game = opts.game;
  var accent = opts.accent || '#5af23a';
  var glow = accent + '55';

  if (!document.getElementById('as-style')) {
    var st = el('style'); st.id = 'as-style'; st.textContent = CSS;
    document.head.appendChild(st);
  }
  var old = document.getElementById('as-root');
  if (old) old.remove();

  var root = el('div'); root.id = 'as-root';
  root.style.setProperty('--as-accent', accent);
  root.style.setProperty('--as-glow', glow);

  var cab = el('div', 'as-cab');
  cab.appendChild(el('div', 'as-marquee', (opts.title || game).toUpperCase() + ' · HI-SCORES'));

  var bezel = el('div', 'as-bezel');
  var crt = el('div', 'as-crt');
  var screen = el('div', 'as-screen');
  crt.appendChild(screen); bezel.appendChild(crt); cab.appendChild(bezel);

  var deck = el('div', 'as-deck');
  var closeBtn = el('button', 'as-back', 'CLOSE');
  closeBtn.addEventListener('click', function () { close(); });
  deck.appendChild(closeBtn);
  cab.appendChild(deck);

  root.appendChild(cab);
  document.body.appendChild(root);

  var motionOK = typeof gsap !== 'undefined' &&
    !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if (motionOK) gsap.fromTo(cab, {opacity: 0, y: 24}, {opacity: 1, y: 0, duration: .4, ease: 'power2.out'});

  function close() { root.remove(); if (opts.onClose) opts.onClose(); }

  screen.appendChild(el('div', 'as-h1', 'HI-SCORES'));
  var list = el('div', 'as-list');
  list.appendChild(el('div', 'as-empty', 'LOADING…'));
  screen.appendChild(list);

  function renderList(scores, localOnly) {
    list.innerHTML = '';
    if (!scores.length) {
      list.appendChild(el('div', 'as-empty', 'NO SCORES YET.\nBE THE FIRST.'));
    } else {
      scores.forEach(function (e, i) {
        var row = el('div', 'as-row');
        row.appendChild(el('span', 'r', String(i + 1).padStart(3, ' ') + '.'));
        row.appendChild(el('span', 'n', e.n));
        row.appendChild(el('span', 's', Number(e.s).toLocaleString('en-GB')));
        list.appendChild(row);
      });
    }
    screen.appendChild(el('div', 'as-note',
      localOnly ? 'LOCAL BOARD — GLOBAL SCORES UNAVAILABLE' : 'GLOBAL BOARD — ALL PLAYERS'));
  }

  fetch('/api/scores?game=' + encodeURIComponent(game))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (d && d.scores) { renderList(d.scores, false); return; }
      renderList(localScores(game), true);
    })
    .catch(function () { renderList(localScores(game), true); });
}

window.ArcadeScores = { show: show, showBoard: showBoard, nameAllowed: nameAllowed, returnUrl: returnUrl };
})();
