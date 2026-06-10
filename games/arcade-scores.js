/* JnJ Arcade — global hi-score board, drawn as a real arcade cabinet.
   Usage (from a game's end screen):
     ArcadeScores.show({ game: 'snake', title: 'SNAKE BLASTER', score: 1234,
                         accent: '#5af23a', onClose: () => {...} });
   Flow: enter name (filtered) → submit → "YOU RANKED #N" with your row
   highlighted in a scrollable board. Falls back to a local-only board
   until the global API has storage. */

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

.as-marquee { flex: 0 0 auto; text-align: center; padding: 16px 10px 12px;
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
.as-btn:active { transform: translateY(4px); box-shadow: 0 1px 0 rgba(0,0,0,0.6); }
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

/* control deck along the bottom edge — fully visible */
.as-deck { flex: 0 0 auto; height: 84px;
  background: linear-gradient(#1a120a, #0c0805);
  border-top: 6px solid #070402; display: flex; align-items: center;
  justify-content: center; gap: 46px;
  padding-bottom: env(safe-area-inset-bottom, 0px); }
.as-stick { width: 13px; height: 34px; background: #0a0705; border-radius: 7px; position: relative; margin-top: 14px; }
.as-stick::before { content: ''; position: absolute; top: -19px; left: 50%;
  transform: translateX(-50%); width: 30px; height: 30px; border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, #ff7a6a, #a01b0c 70%);
  box-shadow: 0 4px 10px rgba(0,0,0,0.7); }
.as-buttons { display: flex; gap: 16px; }
.as-pbtn { width: 32px; height: 32px; border-radius: 50%;
  background: radial-gradient(circle at 32% 28%, rgba(255,255,255,0.6), transparent 40%), var(--as-accent);
  box-shadow: 0 4px 0 rgba(0,0,0,0.65), inset 0 -3px 6px rgba(0,0,0,0.4); }

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
  deck.appendChild(el('div', 'as-stick'));
  var btns = el('div', 'as-buttons');
  btns.appendChild(el('div', 'as-pbtn')); btns.appendChild(el('div', 'as-pbtn'));
  deck.appendChild(btns);
  cab.appendChild(deck);

  root.appendChild(cab);
  document.body.appendChild(root);

  function close() { root.remove(); if (opts.onClose) opts.onClose(); }

  /* ── phase 1: name entry ── */
  function renderEntry() {
    screen.innerHTML = '';
    screen.appendChild(el('div', 'as-h1', 'ENTER YOUR NAME'));
    screen.appendChild(el('div', 'as-score-big', score.toLocaleString('en-GB')));
    screen.appendChild(el('div', 'as-sub', 'YOUR SCORE'));

    var entry = el('div', 'as-entry');
    var input = el('input', 'as-input');
    input.type = 'text'; input.maxLength = 12; input.placeholder = 'AAA';
    input.autocapitalize = 'characters'; input.autocomplete = 'off'; input.spellcheck = false;
    input.setAttribute('enterkeyhint', 'done');
    input.setAttribute('autocorrect', 'off');
    var err = el('div', 'as-err', '');
    var submit = el('button', 'as-btn', 'SUBMIT SCORE');
    var skip = el('button', 'as-skip', 'SKIP');

    entry.appendChild(input); entry.appendChild(err);
    entry.appendChild(submit); entry.appendChild(skip);
    screen.appendChild(entry);
    setTimeout(function () { input.focus(); }, 150);

    function doSubmit() {
      var name = input.value.toUpperCase().replace(/[^A-Z0-9 .\-]/g, '').trim();
      if (name.length < 2) { err.textContent = 'AT LEAST 2 CHARACTERS'; return; }
      if (!nameAllowed(name)) { err.textContent = 'NOT ON THIS CABINET. PICK ANOTHER.'; return; }
      submit.disabled = true; err.textContent = '';

      fetch('/api/scores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ game: game, name: name, score: score }),
      }).then(function (r) {
        if (r.status === 422) { throw { handled: true, msg: 'NOT ON THIS CABINET. PICK ANOTHER.' }; }
        if (!r.ok) throw new Error('api ' + r.status);
        return r.json();
      }).then(function (data) {
        renderBoard(data.rank, data.scores, name, false);
      }).catch(function (e) {
        if (e && e.handled) { err.textContent = e.msg; submit.disabled = false; return; }
        var res = saveLocal(game, { n: name, s: score, t: Date.now() });
        renderBoard(res.rank, res.scores, name, true);
      });
    }
    submit.addEventListener('click', doSubmit);
    input.addEventListener('keydown', function (e) { if (e.key === 'Enter') doSubmit(); });
    skip.addEventListener('click', close);
  }

  /* ── phase 2: the board ── */
  function renderBoard(rank, scores, myName, localOnly) {
    screen.innerHTML = '';
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

    // back to the arcade after 3s; touching the board buys 3 more
    var ticker = el('div', 'as-note', '');
    ticker.style.color = '#ffd23d';
    ticker.style.fontSize = '13px';
    screen.appendChild(ticker);

    var left = 3, timer = null;
    function tick() {
      ticker.textContent = 'BACK TO THE ARCADE IN ' + left + '…';
      if (left <= 0) { window.location.href = '/'; return; }
      left--;
      timer = setTimeout(tick, 1000);
    }
    tick();
    list.addEventListener('touchstart', function () { left = 3; }, { passive: true });
    list.addEventListener('scroll', function () { left = Math.max(left, 2); }, { passive: true });

    if (meRow) setTimeout(function () {
      meRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }, 250);
  }

  renderEntry();
}

window.ArcadeScores = { show: show, nameAllowed: nameAllowed };
})();
