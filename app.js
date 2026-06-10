/* JnJ Arcade — app.js
   Builds the two live cabinets from games.json, runs their attract-mode
   canvas demos, handles fullscreen (Android: real, iOS: A2HS flow). */

'use strict';

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

function isUnlocked(dateStr) {
  return new Date(dateStr + 'T00:00:00') <= TODAY;
}

function shortDate(dateStr) {
  return new Date(dateStr + 'T00:00:00')
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
}

/* ── Play counts ──────────────────────────────────────────── */

function getPlays(id) {
  return parseInt(localStorage.getItem('jnj_plays_' + id) || '0', 10);
}

function bumpPlays(id) {
  localStorage.setItem('jnj_plays_' + id, getPlays(id) + 1);
}

/* ── Per-game worlds ──────────────────────────────────────── */

const WORLDS = {
  'snake': {
    ink: '#5af23a', dim: '#1d4a12', pit: '#0a1405', glowsoft: 'rgba(90,242,58,0.22)',
    genre: 'SNAKE × ARKANOID',
    quote: '“The snake has a gun. I need everyone to understand. THE SNAKE HAS A GUN.”',
    by: 'JIMMY',
    attract: snakeAttract,
  },
  'doom-mario': {
    ink: '#ff6a3d', dim: '#571508', pit: '#160806', glowsoft: 'rgba(255,106,61,0.22)',
    genre: 'DOOM × MARIO',
    quote: '“I died four times. In my day pipes led to coins, not whatever that was.”',
    by: 'JOE',
    attract: doomAttract,
  },
};

const DEFAULT_WORLD = {
  ink: '#ffd23d', dim: '#5c4404', pit: '#14100a', glowsoft: 'rgba(255,210,61,0.22)',
  genre: 'NEW CABINET',
  quote: '“Fresh off the truck. Still warm.”',
  by: 'THE ARCADE',
  attract: snakeAttract,
};

/* ── Fullscreen ───────────────────────────────────────────── */

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const isStandalone = window.navigator.standalone === true
  || window.matchMedia('(display-mode: standalone)').matches
  || window.matchMedia('(display-mode: fullscreen)').matches;

function canFullscreen() {
  const el = document.documentElement;
  return !!(el.requestFullscreen || el.webkitRequestFullscreen);
}

/* Must run synchronously inside a user-gesture handler. */
function tryFullscreen() {
  const el = document.documentElement;
  const req = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!req) return;
  const p = req.call(el, { navigationUI: 'hide' });
  if (p && p.catch) p.catch(() => {});
}

function setupFullscreenUI() {
  if (isStandalone) return; // already chrome-free

  if (isIOS) {
    // iOS Safari has no fullscreen API for pages. A2HS is the only path.
    const btn = document.getElementById('a2hsBtn');
    const sheet = document.getElementById('a2hsSheet');
    btn.hidden = false;
    btn.addEventListener('click', () => {
      const open = sheet.hidden;
      sheet.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
    });
  } else if (canFullscreen()) {
    const btn = document.getElementById('fsBtn');
    btn.hidden = false;
    btn.addEventListener('click', () => {
      tryFullscreen();
      btn.blur();
    });
  }
}

/* ── Cabinet builder ──────────────────────────────────────── */

function buildCabinet(game) {
  const world = WORLDS[game.id] || DEFAULT_WORLD;

  const cab = document.createElement('section');
  cab.className = 'cab';
  cab.style.setProperty('--ink', world.ink);
  cab.style.setProperty('--dim', world.dim);
  cab.style.setProperty('--pit', world.pit);
  cab.style.setProperty('--glowsoft', world.glowsoft);

  const strip = document.createElement('div');
  strip.className = 'cab-marquee';
  strip.textContent = game.name.toUpperCase();
  cab.appendChild(strip);

  const attract = document.createElement('div');
  attract.className = 'cab-attract';
  const glass = document.createElement('div');
  glass.className = 'screen-glass';
  const canvas = document.createElement('canvas');
  glass.appendChild(canvas);

  const tag = document.createElement('span');
  tag.className = 'attract-tag';
  tag.textContent = 'ATTRACT MODE';
  glass.appendChild(tag);

  // your real best score lives on the cabinet; 999999 until you earn one
  const HS_KEYS = { 'snake': 'jnj_snakeblaster_hs', 'doom-mario': 'jnj_doommario_hs' };
  const hs = parseInt(localStorage.getItem(HS_KEYS[game.id] || '') || '0', 10);
  const hsTag = document.createElement('span');
  hsTag.className = 'hiscore-tag';
  hsTag.textContent = 'HI-SCORE ' + (hs > 0 ? hs.toLocaleString('en-GB') : '999999');
  glass.appendChild(hsTag);

  attract.appendChild(glass);
  cab.appendChild(attract);

  const info = document.createElement('div');
  info.className = 'cab-info';

  const genre = document.createElement('p');
  genre.className = 'cab-genre';
  genre.textContent = world.genre;
  info.appendChild(genre);

  const title = document.createElement('h2');
  title.className = 'cab-title';
  title.textContent = game.name.toUpperCase();
  info.appendChild(title);

  const quote = document.createElement('blockquote');
  quote.className = 'cab-quote';
  quote.innerHTML = world.quote + '<cite>— ' + world.by + '</cite>';
  info.appendChild(quote);

  const play = document.createElement('a');
  play.className = 'cab-play';
  play.href = game.url;
  play.textContent = 'INSERT COIN — PLAY FREE';
  play.addEventListener('click', () => {
    bumpPlays(game.id);
    // Fullscreen persists across same-origin navigation on Android Chrome,
    // so the game itself opens chrome-free. Harmless elsewhere.
    if (!isIOS && !isStandalone) tryFullscreen();
  });
  info.appendChild(play);

  const meta = document.createElement('div');
  meta.className = 'cab-meta';
  const plays = getPlays(game.id);
  meta.innerHTML = '<span>' + (game.episode || '').toUpperCase() + '</span>'
    + '<span class="plays">' + (plays > 0 ? 'YOU PLAYED ' + plays + '×' : 'NEVER PLAYED. FIX THAT.') + '</span>';
  info.appendChild(meta);

  cab.appendChild(info);

  startAttract(canvas, world);
  return cab;
}

/* ── Attract-mode runtime ─────────────────────────────────── */

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let TURBO = false;

function startAttract(canvas, world) {
  const ctx = canvas.getContext('2d');
  let w = 0, h = 0, raf = null, visible = false;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width * dpr));
    h = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = w;
    canvas.height = h;
  }

  const state = {};
  const render = world.attract;

  function frame(t) {
    render(ctx, w, h, t, world, state);
    if (visible && !REDUCED) raf = requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver((entries) => {
    visible = entries[0].isIntersecting;
    if (visible) {
      resize();
      if (REDUCED) {
        render(ctx, w, h, 0, world, state); // single static frame
      } else if (!raf) {
        raf = requestAnimationFrame(frame);
      }
    } else if (raf) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  }, { threshold: 0.05 });

  io.observe(canvas);
  window.addEventListener('resize', () => { if (visible) resize(); });
}

/* ── Attract: Snake Blaster ───────────────────────────────────
   A snake hunts food on a grid; on every meal it fires a shot
   that blasts the arkanoid brick wall at the top. */

function snakeAttract(ctx, w, h, t, world, s) {
  const cell = Math.max(10, Math.floor(w / 30));
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);

  if (!s.snake || s.cols !== cols || s.rows !== rows) {
    s.cols = cols; s.rows = rows;
    s.snake = [[3, rows - 3], [2, rows - 3], [1, rows - 3]];
    s.dir = [1, 0];
    s.food = [Math.floor(cols / 2), Math.floor(rows / 2)];
    s.bullets = [];
    s.bricks = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < cols; c++)
        s.bricks.push([c, r]);
    s.last = 0;
    s.flash = 0;
  }

  const stepMs = TURBO ? 45 : 95;
  if (t - s.last > stepMs) {
    s.last = t;

    // steer: greedy toward food, avoid walls/self
    const head = s.snake[0];
    const cand = [];
    const dx = s.food[0] - head[0], dy = s.food[1] - head[1];
    if (Math.abs(dx) >= Math.abs(dy)) {
      cand.push([Math.sign(dx) || 1, 0], [0, Math.sign(dy) || 1], [0, -(Math.sign(dy) || 1)], [-(Math.sign(dx) || 1), 0]);
    } else {
      cand.push([0, Math.sign(dy) || 1], [Math.sign(dx) || 1, 0], [-(Math.sign(dx) || 1), 0], [0, -(Math.sign(dy) || 1)]);
    }
    const bad = (x, y) =>
      x < 0 || y < 3 || x >= cols || y >= rows ||
      s.snake.some(p => p[0] === x && p[1] === y);
    let dir = s.dir;
    for (const d of cand) {
      if (d[0] === -s.dir[0] && d[1] === -s.dir[1]) continue;
      if (!bad(head[0] + d[0], head[1] + d[1])) { dir = d; break; }
    }
    s.dir = dir;
    const nx = head[0] + dir[0], ny = head[1] + dir[1];

    if (bad(nx, ny)) {
      // cornered: respawn (attract mode never shows a game over)
      s.snake = [[3, rows - 3], [2, rows - 3], [1, rows - 3]];
      s.dir = [1, 0];
    } else {
      s.snake.unshift([nx, ny]);
      if (nx === s.food[0] && ny === s.food[1]) {
        s.food = [1 + Math.floor(Math.random() * (cols - 2)), 4 + Math.floor(Math.random() * (rows - 7))];
        s.bullets.push([nx, ny]);                 // every meal fires a shot
        if (s.snake.length > 14) s.snake.length = 8;
      } else {
        s.snake.pop();
      }
    }

    // bullets climb, blast bricks
    s.bullets = s.bullets.filter(b => {
      b[1] -= 1;
      const hit = s.bricks.findIndex(k => k[0] === b[0] && k[1] === b[1]);
      if (hit >= 0) { s.bricks.splice(hit, 1); s.flash = t; return false; }
      return b[1] >= 0;
    });

    // wall slowly heals
    if (Math.random() < 0.12 && s.bricks.length < cols * 3) {
      const c = Math.floor(Math.random() * cols), r = Math.floor(Math.random() * 3);
      if (!s.bricks.some(k => k[0] === c && k[1] === r)) s.bricks.push([c, r]);
    }
  }

  // draw
  ctx.clearRect(0, 0, w, h);
  const pad = Math.max(1, Math.round(cell * 0.1));

  ctx.fillStyle = world.dim;
  for (const [c, r] of s.bricks)
    ctx.fillRect(c * cell + pad, r * cell + pad, cell - pad * 2, cell - pad * 2);

  ctx.fillStyle = world.ink;
  for (const b of s.bullets)
    ctx.fillRect(b[0] * cell + cell * 0.4, b[1] * cell, cell * 0.2, cell * 0.7);

  s.snake.forEach(([c, r], i) => {
    ctx.globalAlpha = i === 0 ? 1 : Math.max(0.35, 1 - i * 0.07);
    ctx.fillStyle = world.ink;
    ctx.fillRect(c * cell + pad, r * cell + pad, cell - pad * 2, cell - pad * 2);
  });
  ctx.globalAlpha = 1;

  // food pulses
  const pulse = 0.72 + 0.28 * Math.sin(t / 220);
  ctx.fillStyle = '#f2e9d8';
  const fs = cell * 0.6 * pulse;
  ctx.fillRect(s.food[0] * cell + (cell - fs) / 2, s.food[1] * cell + (cell - fs) / 2, fs, fs);

  // brick-hit flash
  if (t - s.flash < 90) {
    ctx.fillStyle = 'rgba(242,233,216,0.1)';
    ctx.fillRect(0, 0, w, cell * 3);
  }
}

/* ── Attract: Doom Mari-OH! ───────────────────────────────────
   First-person corridor crawl: depth-cycled wall frames, goombas
   strafing at depth, periodic muzzle flash. */

function doomAttract(ctx, w, h, t, world, s) {
  if (!s.init) {
    s.init = true;
    s.goombas = [
      { z: 0.25, x: -0.6, v: 0.00022 },
      { z: 0.55, x: 0.5,  v: -0.00016 },
      { z: 0.8,  x: 0.1,  v: 0.00019 },
    ];
    s.lastShot = 0;
  }

  const speed = TURBO ? 2.4 : 1;
  const cx = w / 2, cy = h / 2;

  ctx.clearRect(0, 0, w, h);

  // corridor frames marching toward the viewer
  const FRAMES = 11;
  const cycle = (t * 0.00028 * speed) % (1 / FRAMES);
  for (let i = FRAMES; i >= 1; i--) {
    let z = i / FRAMES - cycle;
    if (z <= 0.02) continue;
    const sw = w * z, sh = h * z;
    const a = Math.max(0, 0.55 * (1 - z));
    ctx.strokeStyle = 'rgba(255,106,61,' + a.toFixed(3) + ')';
    ctx.lineWidth = Math.max(1, 3 * (1 - z));
    ctx.strokeRect(cx - sw / 2, cy - sh / 2, sw, sh);
  }

  // perspective seams to the corners
  ctx.strokeStyle = 'rgba(87,21,8,0.9)';
  ctx.lineWidth = 1;
  [[0, 0], [w, 0], [0, h], [w, h]].forEach(([x, y]) => {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(cx, cy);
    ctx.stroke();
  });

  // goombas: chunky pixel mushrooms bobbing at depth
  for (const g of s.goombas) {
    g.x += g.v * speed * 16;
    if (g.x > 0.75 || g.x < -0.75) g.v *= -1;
    const z = g.z;
    const size = Math.max(8, w * 0.16 * (1 - z));
    const gx = cx + g.x * w * 0.4 * (1 - z * 0.5) - size / 2;
    const gy = cy + h * 0.18 * (1 - z) + Math.sin(t * 0.004 + z * 9) * size * 0.08;
    const u = size / 8; // sprite unit

    ctx.fillStyle = '#a8341e';                      // cap
    ctx.fillRect(gx + u, gy, u * 6, u * 3);
    ctx.fillRect(gx, gy + u, u * 8, u * 2);
    ctx.fillStyle = '#e8c9a0';                      // face
    ctx.fillRect(gx + u, gy + u * 3, u * 6, u * 3);
    ctx.fillStyle = '#160806';                      // eyes
    ctx.fillRect(gx + u * 2, gy + u * 3.4, u, u * 1.4);
    ctx.fillRect(gx + u * 5, gy + u * 3.4, u, u * 1.4);
    ctx.fillStyle = '#a8341e';                      // feet
    ctx.fillRect(gx + u * 0.5, gy + u * 6, u * 2.4, u * 1.4);
    ctx.fillRect(gx + u * 5.1, gy + u * 6, u * 2.4, u * 1.4);
  }

  // the gun (bottom centre, slight sway)
  const sway = Math.sin(t * 0.0021) * w * 0.012;
  const gw = w * 0.16, gh = h * 0.2;
  ctx.fillStyle = '#3d2317';
  ctx.fillRect(cx - gw / 2 + sway, h - gh, gw, gh);
  ctx.fillStyle = '#57331f';
  ctx.fillRect(cx - gw * 0.32 + sway, h - gh * 0.72, gw * 0.64, gh * 0.2);

  // muzzle flash every ~2.8s
  const sinceShot = t - s.lastShot;
  if (sinceShot > (TURBO ? 1200 : 2800)) s.lastShot = t;
  if (sinceShot < 110) {
    ctx.fillStyle = 'rgba(255,210,61,0.9)';
    const fr = w * 0.05 * (1 - sinceShot / 110);
    ctx.beginPath();
    ctx.arc(cx + sway, h - gh, fr * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,240,0.08)';
    ctx.fillRect(0, 0, w, h);
  }

  // crosshair
  ctx.strokeStyle = 'rgba(242,233,216,0.5)';
  ctx.lineWidth = Math.max(1, w / 400);
  const ch = w * 0.012;
  ctx.beginPath();
  ctx.moveTo(cx - ch, cy); ctx.lineTo(cx + ch, cy);
  ctx.moveTo(cx, cy - ch); ctx.lineTo(cx, cy + ch);
  ctx.stroke();
}

/* ── Next release strip ───────────────────────────────────── */

function buildNextStrip(games) {
  const upcoming = games
    .filter(g => !isUnlocked(g.releaseDate))
    .sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate))[0];
  if (!upcoming) return;

  document.getElementById('nextName').textContent = upcoming.name.toUpperCase();
  document.getElementById('nextDate').textContent = shortDate(upcoming.releaseDate);
  document.getElementById('nextStrip').hidden = false;
}

/* ── Socials ──────────────────────────────────────────────── */

const COIN_COLORS = { Shop: '#ffd23d', YouTube: '#ff4040', Patreon: '#ff6e4a', KoFi: '#4ad7ff' };

function buildSocials(social) {
  const row = document.getElementById('socialRow');
  social.forEach(app => {
    const a = document.createElement('a');
    a.className = 'coin-btn';
    a.href = app.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.style.setProperty('--c', COIN_COLORS[app.label] || '#ffd23d');
    a.innerHTML = '<span class="dome"></span><span class="tag">' + app.name.toUpperCase() + '</span>';
    row.appendChild(a);
  });
}

/* ── Toast + TURBO easter egg ─────────────────────────────── */

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(el._t);
  el._t = setTimeout(() => el.classList.remove('show'), 2200);
}

function setupTurbo() {
  const KONAMI = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
  let ki = 0;
  document.addEventListener('keydown', (e) => {
    ki = (e.key === KONAMI[ki]) ? ki + 1 : (e.key === KONAMI[0] ? 1 : 0);
    if (ki === KONAMI.length) { ki = 0; engageTurbo(); }
  });

  // mobile: 7 taps on the sign
  let taps = 0, tapTimer = null;
  document.getElementById('sign').addEventListener('click', () => {
    taps++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { taps = 0; }, 1600);
    if (taps >= 7) { taps = 0; engageTurbo(); }
  });

  function engageTurbo() {
    TURBO = !TURBO;
    document.body.classList.toggle('turbo', TURBO);
    toast(TURBO ? 'TURBO MODE ENGAGED' : 'TURBO MODE OFF');
  }
}

/* ── Init ─────────────────────────────────────────────────── */

async function init() {
  setupFullscreenUI();
  setupTurbo();

  try {
    const resp = await fetch('games.json?v=' + Date.now());
    const data = await resp.json();

    const live = data.games
      .filter(g => isUnlocked(g.releaseDate))
      .sort((a, b) => a.week - b.week);

    const hall = document.getElementById('cabinets');
    if (live.length === 0) {
      hall.innerHTML = '<p class="hall-empty">ARCADE OPENING SOON.<br>THE MACHINES ARE ON THE TRUCK.</p>';
    } else {
      live.forEach(g => hall.appendChild(buildCabinet(g)));
    }

    buildNextStrip(data.games);
    buildSocials(data.social);
  } catch (err) {
    console.error('games.json failed:', err);
    document.getElementById('cabinets').innerHTML =
      '<p class="hall-empty">GAME OVER.<br>ARCADE DATA FAILED TO LOAD.<br>PRESS REFRESH TO CONTINUE.</p>';
  }
}

document.addEventListener('DOMContentLoaded', init);
