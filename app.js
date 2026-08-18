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
  'brick-invaders': {
    ink: '#7dff5a', dim: '#1e4a14', pit: '#081204', glowsoft: 'rgba(125,255,90,0.22)',
    genre: 'BREAKOUT × SPACE INVADERS',
    quote: '“The wall marches AT you. Breakout with a deadline. My paddle hand has never known this kind of pressure.”',
    by: 'JIMMY',
    attract: brickInvadersAttract,
  },
  'snake': {
    ink: '#5af23a', dim: '#1d4a12', pit: '#0a1405', glowsoft: 'rgba(90,242,58,0.22)',
    genre: 'SNAKE × ARKANOID',
    quote: '“The snake has a gun. I need everyone to understand. THE SNAKE HAS A GUN.”',
    by: 'JIMMY',
    attract: snakeAttract,
  },
  'doom-3d': {
    ink: '#ff3355', dim: '#5c0f1c', pit: '#160508', glowsoft: 'rgba(255,51,85,0.22)',
    genre: 'FULL 3D RAYCASTER',
    quote: '“I died four times. In my day pipes led to coins, not whatever that was.”',
    by: 'JOE',
    attract: doomAttract,
  },
  'hop-man': {
    ink: '#ffcf3d', dim: '#5c4404', pit: '#140f04', glowsoft: 'rgba(255,207,61,0.22)',
    genre: 'PAC-MAN × FROGGER',
    quote: '“A frog hops into four lanes of traffic to collect snacks. In my day that was a tragedy. Now it’s a high score.”',
    by: 'JOE',
    attract: hopAttract,
  },
  'flap-fight': {
    ink: '#4dd9f5', dim: '#0d4a5c', pit: '#030f18', glowsoft: 'rgba(77,217,245,0.22)',
    genre: 'BALLOON FIGHT × FLAPPY BIRD',
    quote: '"stomped a parachute guy mid-gap. bounced straight into a pipe. still my best run."',
    by: 'JIMMY',
    attract: flapAttract,
  },
  'tomb-hunt': {
    ink: '#d4a017', dim: '#4a3200', pit: '#0d0a02', glowsoft: 'rgba(212,160,23,0.22)',
    genre: 'JUNGLE HUNT × TOMB RAIDER',
    quote: '"In my day archaeology meant a shovel and a permit. She turned up with twin pistols and just started running. I have questions."',
    by: 'JOE',
    attract: tombHuntAttract,
  },
  'bomb-garden': {
    ink: '#3d7a28', dim: '#1a4010', pit: '#070d04', glowsoft: 'rgba(61,122,40,0.22)',
    genre: 'BOMBERMAN × PLANTS VS ZOMBIES',
    quote: '"In my day you either planted things OR blew things up. Not both. Nobody asked for both."',
    by: 'JOE',
    attract: bombGardenAttract,
  },
  'candy-tris': {
    ink: '#ff69b4', dim: '#8b1a5a', pit: '#0a0012', glowsoft: 'rgba(255,105,180,0.22)',
    genre: 'CANDY CRUSH × TETRIS',
    quote: '"Tetris blocks made of sweets. I\'ve been trying to resist. My doctor says I\'m doing brilliantly. My doctor doesn\'t know about this."',
    by: 'JOE',
    attract: candyTrisAttract,
  },
  'stl-lab': {
    ink: '#b8ff5c', dim: '#3d5c18', pit: '#080d04', glowsoft: 'rgba(184,255,92,0.22)',
    genre: 'BUILD OUR STUDIO',
    quote: '"Someone printed us a mug, Jimmy. We don\'t drink. I\'ve decided not to raise it."',
    by: 'JOE',
    attract: stlLabAttract,
  },
  'face-lab': {
    ink: '#7ee0ff', dim: '#1a5a6e', pit: '#020a0e', glowsoft: 'rgba(126,224,255,0.22)',
    genre: 'MAKE OUR FACES',
    quote: '"They\'re letting the internet design my face. My actual face. I\'ve seen what the internet does with power, Jimmy."',
    by: 'JOE',
    attract: faceLabAttract,
  },
  'jnj-on-air': {
    ink: '#e8a13c', dim: '#5c3d12', pit: '#160f06', glowsoft: 'rgba(232,161,60,0.22)',
    genre: 'MONKEY ISLAND × TALK SHOW',
    quote: '"An adventure game where the goal is starting work on time. I have never felt more seen by a cabinet."',
    by: 'JOE',
    attract: onairAttract,
  },
  'jungle-hop': {
    ink: '#79c93c', dim: '#2e5414', pit: '#0a1405', glowsoft: 'rgba(121,201,60,0.22)',
    genre: 'PITFALL × DK JR',
    quote: '"He swung across a crocodile pit for a banana. There was a bridge. I counted three bridges."',
    by: 'JOE',
    attract: jungleHopAttract,
  },
  'angry-worms': {
    ink: '#e8302a', dim: '#5a1a10', pit: '#100604', glowsoft: 'rgba(232,48,42,0.22)',
    genre: 'ANGRY BIRDS × WORMS',
    quote: '"They never shoot back. Some of them land, dig in, and open fire. Jimmy calls that balance. I call it a war crime with a slingshot."',
    by: 'JOE',
    attract: angryWormsAttract,
  },
  'pin-vaders': {
    ink: '#b76bff', dim: '#4a2470', pit: '#0c0514', glowsoft: 'rgba(183,107,255,0.22)',
    genre: 'PINBALL × SPACE INVADERS',
    quote: '"They crossed the galaxy in perfect formation. Lost to a pinball. Jimmy stood up and saluted the flippers."',
    by: 'JOE',
    attract: pinVadersAttract,
  },
  'chrome-flipper': {
    ink: '#00e5ff', dim: '#004a52', pit: '#000a0c', glowsoft: 'rgba(0,229,255,0.22)',
    genre: 'PINBALL × CYBERPUNK',
    quote: '"Neon pinball. For people who thought regular pinball wasn\'t complicated enough."',
    by: 'JOE',
    attract: chromeFlipperAttract,
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

/* ── PWA install prompt (Chrome/Edge/Android) ─────────────── */
let _deferredInstallPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredInstallPrompt = e;
  // Show install button as soon as the prompt is capturable
  const btn = document.getElementById('installBtn');
  if (btn && !isStandalone) btn.hidden = false;
});
window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('installBtn');
  if (btn) btn.hidden = true;
  _deferredInstallPrompt = null;
});

function setupFullscreenUI() {
  if (isStandalone) return; // already chrome-free

  if (isIOS) {
    // iOS Safari has no fullscreen API and no beforeinstallprompt. A2HS sheet is the only path.
    const btn = document.getElementById('a2hsBtn');
    const sheet = document.getElementById('a2hsSheet');
    if (btn && sheet) {
      btn.hidden = false;
      btn.addEventListener('click', () => {
        const open = sheet.hidden;
        sheet.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      });
    }
    // Share button inside sheet — fires navigator.share() to open iOS share sheet
    const shareBtn = document.getElementById('a2hsShareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', async () => {
        if (navigator.share) {
          try { await navigator.share({ title: 'JnJ Arcade', url: 'https://jnjarcade.win' }); }
          catch(e) { /* cancelled */ }
        }
      });
    }
  } else {
    // Chrome/Android: wire up the captured install prompt
    const installBtn = document.getElementById('installBtn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        if (!_deferredInstallPrompt) return;
        _deferredInstallPrompt.prompt();
        const { outcome } = await _deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') installBtn.hidden = true;
        _deferredInstallPrompt = null;
      });
    }

    if (canFullscreen()) {
      // go fullscreen on the very first gesture, no button required
      const claim = () => {
        if (!document.fullscreenElement) tryFullscreen();
        document.removeEventListener('touchend', claim);
        document.removeEventListener('click', claim);
      };
      document.addEventListener('touchend', claim);
      document.addEventListener('click', claim);

      // pill stays as a manual fallback (e.g. after pressing Esc)
      const btn = document.getElementById('fsBtn');
      if (btn) {
        btn.hidden = false;
        btn.addEventListener('click', () => {
          tryFullscreen();
          btn.blur();
        });
      }
    }
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

  const hsTag = document.createElement('span');
  hsTag.className = 'hiscore-tag';
  // Addressable so hydrateHiScores() can overwrite it with the SERVER number.
  // Until 2026-07-29 this tag was localStorage-only, so a cabinet you had never played
  // ON THIS DEVICE fell through to a hardcoded '999999' — pin-vaders, crushtris and
  // angry-worms all advertised a fake record while the real leaderboard (372,270 on
  // pin-vaders) sat one fetch away and was already being shown in the footer.
  hsTag.setAttribute('data-hs', game.id);
  hsTag.textContent = 'HI-SCORE ' + (function(id) {
    // ArcadeScores board (hop-man, bomb-garden, candy-tris, …)
    try {
      const board = JSON.parse(localStorage.getItem('jnj_board_' + id) || '[]');
      if (board.length) return Math.max(...board.map(e => e.s || 0)).toLocaleString('en-GB');
    } catch (e) {}
    // Per-game simple keys
    const KEYS = { 'snake': 'jnj_snakeblaster_hs', 'doom-3d': 'jnj_doom3d_hs',
                   'flap-fight': 'hs_flap-fight', 'tomb-hunt': 'th_best' };
    const v = parseInt(localStorage.getItem(KEYS[id] || '') || '0', 10);
    // No local record: show a dash, NOT a fake number. Same rule the footer slot
    // already follows — a cabinet nobody has beaten must not advertise 999,999.
    // hydrateHiScores() replaces this the moment the server answers.
    return v > 0 ? v.toLocaleString('en-GB') : '—';
  }(game.id));
  // Tap the HI-SCORE tag to browse the full leaderboard without leaving the
  // arcade or having a score to submit (Osimo 2026-08-02: "click on the high
  // scorer it should open the score board"). Own listener, not the play link.
  hsTag.style.cursor = 'pointer';
  hsTag.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    if (window.ArcadeScores) {
      window.ArcadeScores.showBoard({ game: game.id, title: game.name, accent: world.ink });
    }
  });
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
  // LOCKED cabinet — a Patreon game shown on the FREE /arcade as a teaser (Osimo
  // 2026-07-29: "the most played 3 games from our patreon page... locked behind
  // patreon"). Same cassette art and attract loop so it still sells itself; the button
  // goes to Patreon instead of the game, and deliberately does NOT count a play —
  // nobody played anything, and a fake count would corrupt the very ranking that
  // chose these three.
  if (game.locked) {
    play.href = 'https://www.patreon.com/c/JimmyJoeAiPodcast';
    play.target = '_blank';
    play.rel = 'noopener';
    play.textContent = '🔒 UNLOCK ON PATREON';
    info.appendChild(play);
    cab.appendChild(info);
    startAttract(canvas, world);
    return cab;
  }
  // play=1 skips the game's own start screen; v busts any stale cached copy
  play.href = game.url + '?play=1&v=19';
  play.textContent = 'INSERT COIN — PLAY FREE';
  play.addEventListener('click', () => {
    // Remember which hall launched this cabinet so the score screen returns the player
    // here instead of always to the main arcade (Osimo 2026-07-29: "in patreon when you
    // complete a game and submit your score it kicks you out to the main arcade").
    // localStorage, NOT sessionStorage (Osimo 2026-08-02: "kicked me out to the regular
    // arcade" from patreon-arcade — couldn't reproduce with a clean click-through, so the
    // live suspect is iOS Safari: this same handler calls tryFullscreen() a few lines
    // down, and a fullscreen-triggering navigation can land in a WebKit context that
    // doesn't carry sessionStorage over (also tab-scoped — Add to Home Screen icons get
    // a fresh tab with none of it). localStorage is disk-backed and origin-wide, immune
    // to both.
    try { localStorage.setItem('jnj_return', location.pathname); } catch (e) {}
    bumpPlays(game.id);
    reportPlay(game.id);
    // Fullscreen persists across same-origin navigation on Android Chrome,
    // so the game itself opens chrome-free. Harmless elsewhere.
    if (!isIOS && !isStandalone) tryFullscreen();
  });
  info.appendChild(play);

  const meta = document.createElement('div');
  meta.className = 'cab-meta';
  const worldwide = GLOBAL_PLAYS[game.id] || 0;
  const mine = getPlays(game.id);
  const playLine = worldwide > 0
    ? worldwide.toLocaleString('en-GB') + ' PLAYS WORLDWIDE'
    : (mine > 0 ? 'YOU PLAYED ' + mine + '×' : 'NEVER PLAYED. FIX THAT.');
  // HI-SCORE slot, filled asynchronously by hydrateHiScores(). Left EMPTY rather than
  // showing a placeholder — a cabinet nobody has beaten yet must not advertise a fake
  // record (Osimo 2026-07-29: "cassettes that don't have the high score reflect the
  // actual high score"; pin-vaders was showing a hardcoded 999,999 while the real best
  // was 372,270).
  meta.innerHTML = '<span>' + (game.episode || '').toUpperCase() + '</span>'
    + '<span class="cab-hi" data-hi="' + game.id + '"></span>'
    + '<span class="plays">' + playLine + '</span>';
  const cabHi = meta.querySelector('.cab-hi');
  cabHi.style.cursor = 'pointer';
  cabHi.addEventListener('click', function (e) {
    e.preventDefault(); e.stopPropagation();
    if (window.ArcadeScores) {
      window.ArcadeScores.showBoard({ game: game.id, title: game.name, accent: world.ink });
    }
  });
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

/* FLAP-FIGHT attract — real physics, AI targets gap, dies on pipe hit */
function flapAttract(ctx, w, h, t, world, s) {
  const GROUND = Math.max(10, h * 0.10);
  const PW     = Math.max(12, w * 0.14);
  const BR     = 7;    // bird radius
  const GAP_H  = h * 0.42;  // wide gap — AI can navigate it reliably
  const SPEED  = w * 0.000704;
  const GRAV   = 0.26;
  const FLAP   = -5.2;

  if (!s.init) {
    s.init   = true;
    s.last   = t;
    s.birdY  = h * 0.48;
    s.birdVy = 0;
    s.pipes  = [
      { x: w * 0.78, gap: h * 0.26, gapH: GAP_H },
      { x: w * 1.52, gap: h * 0.18, gapH: GAP_H },
    ];
    s.enemies = [
      { x: w * 0.54, y: h * 0.36, vy:  0.38, popped: false, popTimer: 0 },
      { x: w * 0.86, y: h * 0.58, vy: -0.50, popped: false, popTimer: 0 },
      { x: w * 1.18, y: h * 0.25, vy:  0.44, popped: false, popTimer: 0 },
    ];
    s.particles = [];
    s.stars = Array.from({length: 22}, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.80,
      r: Math.random() * 1.4 + 0.4, a: Math.random() * 0.45 + 0.15,
    }));
    // 3 cloud layers: [x, y, width, alpha, speed-multiplier]
    s.clouds = [
      // far (slow, dim)
      ...[0,1,2,3].map(i => ({ x: w*(0.05+i*0.25), y: h*(0.08+Math.random()*0.12), wr: w*0.09, a:0.08, spd:0.18 })),
      // mid
      ...[0,1,2].map(i => ({ x: w*(0.10+i*0.35), y: h*(0.20+Math.random()*0.14), wr: w*0.12, a:0.13, spd:0.38 })),
      // near (fast, bright)
      ...[0,1].map(i  => ({ x: w*(0.15+i*0.55), y: h*(0.30+Math.random()*0.10), wr: w*0.10, a:0.18, spd:0.65 })),
    ];
  }

  const dt = Math.min(t - s.last, 32);
  s.last = t;

  // ── physics ──
  s.birdVy += GRAV;
  s.birdY  += s.birdVy * (dt / 16);

  // ── AI: flap proactively toward gap centre — no death in attract ──
  const bx = w * 0.27;
  const ahead = s.pipes.filter(p => p.x + PW > bx + BR).sort((a,b) => a.x - b.x)[0];
  if (ahead) {
    const target = ahead.gap + GAP_H * 0.5;
    if (s.birdY > target - 18 && s.birdVy > -1.5) s.birdVy = FLAP;
  }
  // soft clamp — never touches ceiling/floor
  s.birdY = Math.max(BR + 4, Math.min(h - GROUND - BR - 4, s.birdY));

  // ── move pipes ──
  for (const p of s.pipes) {
    p.x -= SPEED * dt;
    if (p.x + PW < 0) {
      p.x   = w + PW;
      p.gap = h * (0.10 + Math.random() * 0.42);
      p.gapH = GAP_H;
    }
  }

  // ── enemies ──
  for (const e of s.enemies) {
    if (e.popped) {
      e.popTimer -= dt;
      if (e.popTimer <= 0) { e.popped = false; e.x = w + 14; e.y = h * (0.25 + Math.random() * 0.35); }
    } else {
      e.x -= SPEED * 0.55 * dt;
      e.y += e.vy * (dt / 16);
      if (e.y < h * 0.12 + 26 || e.y > h * 0.68) e.vy *= -1;
      if (e.x + 14 < 0) { e.x = w + 14; e.y = h * (0.25 + Math.random() * 0.35); }
      // stomp check
      const DOME_R = 11, DOME_CY = e.y - DOME_R - 1;
      const dx = bx - e.x, dy = s.birdY - DOME_CY;
      if (s.birdVy > 0 && Math.sqrt(dx*dx + dy*dy) < BR + DOME_R) {
        s.birdVy = -4.8;
        e.popped = true; e.popTimer = 1600;
        const cols = ['#ff6b4a','#ffcf3d','#ffffff','#ff3355'];
        for (let i = 0; i < 10; i++) {
          const ang = (i / 10) * Math.PI * 2, spd = 1.5 + Math.random() * 2.5;
          s.particles.push({ x: e.x, y: DOME_CY, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 1, life: 1, col: cols[i%4] });
        }
      }
    }
  }

  // ── particles ──
  s.particles = s.particles.filter(p => p.life > 0);
  for (const p of s.particles) {
    p.x += p.vx * (dt / 16); p.y += p.vy * (dt / 16); p.vy += 0.12; p.life -= dt / 600;
  }

  // ── DRAW ──
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#030f18'); sky.addColorStop(1, '#071a2a');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

  // stars
  for (const st of s.stars) {
    ctx.globalAlpha = st.a; ctx.fillStyle = '#b0f0ff';
    ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // parallax clouds — scroll + wrap
  for (const c of s.clouds) {
    c.x -= SPEED * c.spd * dt;
    if (c.x + c.wr * 1.5 < 0) c.x = w + c.wr;
    const cr = c.wr * 0.5;
    ctx.fillStyle = `rgba(180,220,255,${c.a})`;
    ctx.beginPath(); ctx.arc(c.x,          c.y,        cr*1.2, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x+cr*1.4,   c.y+cr*0.2, cr,     0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x-cr*0.9,   c.y+cr*0.3, cr*0.8, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(c.x+cr*0.5,   c.y-cr*0.3, cr*0.7, 0, Math.PI*2); ctx.fill();
  }

  // pipes
  for (const p of s.pipes) {
    const g = ctx.createLinearGradient(p.x, 0, p.x+PW, 0);
    g.addColorStop(0,'#0a5e3a'); g.addColorStop(0.4,'#12834f'); g.addColorStop(1,'#053a24');
    ctx.fillStyle = g;
    ctx.fillRect(p.x, 0, PW, p.gap);
    ctx.fillStyle = '#15a358'; ctx.fillRect(p.x-3, p.gap-8, PW+6, 8);
    const bTop = p.gap + GAP_H;
    ctx.fillStyle = g; ctx.fillRect(p.x, bTop, PW, h-bTop-GROUND);
    ctx.fillStyle = '#15a358'; ctx.fillRect(p.x-3, bTop, PW+6, 8);
  }

  // ground
  ctx.fillStyle = '#0a4a26'; ctx.fillRect(0, h-GROUND, w, GROUND);
  ctx.fillStyle = '#15a358'; ctx.fillRect(0, h-GROUND, w, 3);

  // pop particles
  for (const p of s.particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.col;
    ctx.beginPath(); ctx.arc(p.x, p.y, 2.5, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // parachute enemies (3, skip when popped) — dome doubled for cassette visibility
  const panels = ['#ff6b4a','#ffcf3d','#ff6b4a','#ffcf3d'];
  for (const e of s.enemies) {
    if (e.popped) continue;
    const ex = e.x, ey = e.y, cr = 22, es = 2;  // cr doubled (11→22), es=scale for fixed coords
    ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(ex-cr*0.7, ey-cr-1); ctx.lineTo(ex-3*es, ey); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ex+cr*0.7, ey-cr-1); ctx.lineTo(ex+3*es, ey); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.fillStyle = panels[i];
      ctx.beginPath(); ctx.moveTo(ex, ey-cr-1);
      ctx.arc(ex, ey-cr-1, cr, Math.PI+(i/4)*Math.PI, Math.PI+((i+1)/4)*Math.PI);
      ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle='rgba(0,0,0,0.25)'; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(ex, ey-cr-1, cr, Math.PI, 0); ctx.closePath(); ctx.stroke();
    ctx.fillStyle='#e84040'; ctx.beginPath(); ctx.arc(ex, ey, 5*es, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.arc(ex-2, ey-2, 2.5, 0, Math.PI*2); ctx.fill();
  }

  // bird — 2.4× scale so it reads clearly on the cassette
  const bx2 = bx, by2 = s.birdY;
  const rot = Math.min(Math.max(s.birdVy * 4, -25), 80) * Math.PI / 180;
  ctx.save(); ctx.translate(bx2, by2); ctx.rotate(rot); ctx.scale(2.4, 2.4);
  ctx.fillStyle = '#FFE566';
  ctx.beginPath(); ctx.ellipse(0, 0, BR+1, BR, 0, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#FFF8E0';
  ctx.beginPath(); ctx.ellipse(2, 2, 4, 3, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#3A2000'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(3, -1, 3.5, 0, Math.PI*2); ctx.stroke();
  ctx.fillStyle = 'rgba(155,95,0,0.42)';
  ctx.beginPath(); ctx.arc(3, -1, 3, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4, -1, 1.2, 0, Math.PI*2); ctx.fill();
  ctx.fillStyle = '#F5A000';
  ctx.beginPath(); ctx.moveTo(BR,-.5); ctx.lineTo(BR+6,-1); ctx.lineTo(BR+6,1.5); ctx.closePath(); ctx.fill();
  ctx.restore();
}

/* HOP-MAN attract — frog rows of pellets, rides logs, dodges cars.
   Layout (screen top→bottom): road·road·safe·river·river·safe·safe(spawn)
   Frog clears pellets in a row then hops up. River: rides log. Road: waits for gap. */
function brickInvadersAttract(ctx, w, h, t, world, s) {
  // marching brick wall + auto-paddle carving it — small, looping, competent
  const cols = 6, rows = 3, bw = Math.floor(w / 8), bh = Math.max(6, Math.floor(h / 14));
  const phase = Math.floor(t / 900), sub = (t % 900) / 900;
  const dir = (Math.floor(phase / 6) % 2 === 0) ? 1 : -1;
  const offX = (phase % 6) * dir * 4 + (dir > 0 ? 0 : 24);
  const drop = Math.floor(phase / 6) * 3 % Math.max(1, Math.floor(h / 4));
  const cx = w / 2 + Math.sin(t / 700) * w * 0.3;
  const by = h - bh * 1.6 - 4;
  const ballY = h * 0.45 + Math.sin(t / 260) * h * 0.28;
  const ballX = cx + Math.cos(t / 410) * w * 0.18;
  ctx.fillStyle = world.pit; ctx.fillRect(0, 0, w, h);
  const rowCols = ['#7dff5a', '#4de6a0', '#35c8e8'];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if ((r * cols + c + phase) % 7 === 0) continue;   // carved gaps
      ctx.fillStyle = rowCols[r];
      ctx.fillRect(6 + c * (bw + 3) + offX, 5 + r * (bh + 3) + drop, bw, bh);
    }
  ctx.fillStyle = '#ff4d4d'; ctx.fillRect(0, h - bh * 3.4, w, 2);
  ctx.fillStyle = world.ink;
  ctx.fillRect(cx - bw * 0.9, by, bw * 1.8, bh * 0.8);
  ctx.beginPath(); ctx.fillStyle = '#fff';
  ctx.arc(ballX, ballY, Math.max(2.5, bh * 0.3), 0, Math.PI * 2); ctx.fill();
}

function hopAttract(ctx, w, h, t, world, s) {
  const COLS = 14;
  const cell = Math.max(8, Math.floor(w / COLS));
  const rows = Math.floor(h / cell);
  const RCOUNT = Math.min(rows, 8);  // use up to 8 rows

  // row layout (index from bottom, 0=spawn)
  // rScreen = RCOUNT - 1 - rL
  const TYPES = ['safe','safe','river','river','safe','road','road','safe'];
  // truncated to RCOUNT rows
  const layout = TYPES.slice(0, RCOUNT);

  function rScreen(rL) { return RCOUNT - 1 - rL; }
  function rowY(rL)    { return (rows - RCOUNT) * cell / 2 + rScreen(rL) * cell; }

  if (!s.init || s.cell !== cell || s.rcount !== RCOUNT) {
    s.init = true; s.cell = cell; s.rcount = RCOUNT;
    // pellets on safe rows
    s.pellets = {};
    for (let rL = 0; rL < RCOUNT; rL++)
      if (layout[rL] === 'safe') s.pellets[rL] = Array.from({length: COLS}, () => true);
    // logs: river rows, alternating direction
    s.logs = [];
    let ld = 1;
    for (let rL = 0; rL < RCOUNT; rL++) {
      if (layout[rL] === 'river') {
        const dir = ld; ld = -ld;
        s.logs.push({rL, dir, items: [{x: 0.5},{x: 5},{x: 9.5}]});
      }
    }
    // cars: road rows, alternating direction
    s.cars = [];
    let cd = 1;
    for (let rL = 0; rL < RCOUNT; rL++) {
      if (layout[rL] === 'road') {
        const dir = cd; cd = -cd;
        s.cars.push({rL, dir, items: [{x: 1},{x: 6.5},{x: 11}]});
      }
    }
    s.frogL = 0; s.fx = Math.floor(COLS / 2);
    s.ridingLog = null;
    s.last = 0; s.stepMs = 420;
  }

  // ── TICK — the frog PLANS before it hops (2026-07-02: it used to hop blind into
  // rivers/roads and sit in water / under cars). Rules: never enter a river row unless
  // a log is underneath; never enter a road row unless the gap survives a tick; while
  // exposed on a road, sidestep away from the nearest car. ──
  if (t - s.last > s.stepMs) {
    s.last = t;
    // move logs
    for (const lane of s.logs)
      for (const lg of lane.items) {
        lg.x += lane.dir * 0.4;
        if (lg.x > COLS + 3) lg.x = -3;
        if (lg.x < -3) lg.x = COLS + 3;
      }
    // move cars
    for (const lane of s.cars)
      for (const car of lane.items) {
        car.x += lane.dir * 0.6;
        if (car.x > COLS + 2) car.x = -2;
        if (car.x < -2) car.x = COLS + 2;
      }

    const LOG_HALF = 1.3;   // logs are 2.6 cells wide
    const CAR_HALF = 0.92;  // cars are 1.85 cells

    // Can the frog ENTER row rT at column fx right now (and survive the next tick)?
    function safeEntry(rT, fx) {
      if (rT >= RCOUNT) return true;                       // off the top = goal
      const tp = layout[rT];
      if (tp === 'safe') return true;
      if (tp === 'river') {
        const lane = s.logs.find(l => l.rL === rT);
        return lane && lane.items.find(lg => Math.abs(lg.x + LOG_HALF - fx) < LOG_HALF - 0.25);
      }
      if (tp === 'road') {
        // this row's gap must survive one tick of car movement…
        const lane = s.cars.find(l => l.rL === rT);
        if (lane && lane.items.some(c => Math.abs(c.x + CAR_HALF - fx) <= CAR_HALF + 0.95)) return false;
        // …AND if the NEXT row is also road, its gap must be open one tick from now,
        // so the frog crosses the double-road in consecutive hops instead of loitering
        if (layout[rT + 1] === 'road') {
          const lane2 = s.cars.find(l => l.rL === rT + 1);
          if (lane2 && lane2.items.some(c =>
              Math.abs((c.x + lane2.dir * 0.6) + CAR_HALF - fx) <= CAR_HALF + 0.95)) return false;
        }
        return true;
      }
      return true;
    }
    function hopUp() {
      const rT = s.frogL + 1;
      if (rT >= RCOUNT) { _hopReset(s, COLS, RCOUNT, layout); return true; }
      if (!safeEntry(rT, s.fx)) return false;
      s.frogL = rT;
      if (layout[rT] === 'river') {
        const lane = s.logs.find(l => l.rL === rT);
        s.ridingLog = lane.items.find(lg => Math.abs(lg.x + LOG_HALF - s.fx) < LOG_HALF - 0.25) || null;
        if (s.ridingLog) s.fx = s.ridingLog.x + LOG_HALF;   // land ON the log
      } else {
        s.ridingLog = null;
        s.fx = Math.round(Math.max(0, Math.min(COLS - 1, s.fx)));
      }
      return true;
    }

    const type = layout[s.frogL] || 'safe';

    if (type === 'river') {
      // stay glued to the log; hop up the moment the next row is enterable
      if (s.ridingLog) s.fx = s.ridingLog.x + LOG_HALF;
      if (!s.ridingLog || s.fx < 0.4 || s.fx > COLS - 0.4) {
        _hopReset(s, COLS, RCOUNT, layout);                 // carried off-screen — respawn
      } else {
        hopUp();
      }
    } else if (type === 'road') {
      // exposed — leave ASAP; if the row above is blocked, dodge the nearest car
      if (!hopUp()) {
        const lane = s.cars.find(l => l.rL === s.frogL);
        if (lane) {
          let nearest = null, nd = 99;
          for (const c of lane.items) {
            const d = Math.abs(c.x + CAR_HALF - s.fx);
            if (d < nd) { nd = d; nearest = c; }
          }
          if (nearest && nd < 2.5) {
            const away = (s.fx < nearest.x + CAR_HALF) ? -1 : 1;
            s.fx = Math.max(0, Math.min(COLS - 1, Math.round(s.fx + away)));
          }
        }
      }
    } else {
      // safe row: eat pellets, aligning hops with what's coming next
      const fc = Math.round(s.fx);
      if (s.pellets[s.frogL]) s.pellets[s.frogL][fc] = false;
      let target = -1;
      if (s.pellets[s.frogL]) {
        let best = 99;
        for (let c = 0; c < COLS; c++)
          if (s.pellets[s.frogL][c] && Math.abs(c - fc) < best) { best = Math.abs(c - fc); target = c; }
      }
      if (target >= 0) {
        s.fx = fc + Math.sign(target - fc);                 // walk toward nearest pellet
      } else if (!hopUp()) {
        // row cleared but can't enter yet — walk toward the best intercept
        const rT = s.frogL + 1, tp = layout[rT];
        if (tp === 'river') {
          const lane = s.logs.find(l => l.rL === rT);
          if (lane) {
            let nearest = null, nd = 99;
            for (const lg of lane.items) {
              // meet the log where it will be NEXT tick
              const cx = lg.x + lane.dir * 0.4 + LOG_HALF;
              const d = Math.abs(cx - s.fx);
              if (d < nd && cx > 0.5 && cx < COLS - 0.5) { nd = d; nearest = cx; }
            }
            if (nearest !== null) s.fx = Math.max(0, Math.min(COLS - 1, s.fx + Math.sign(nearest - s.fx) * Math.min(1, nd)));
          }
        }
        // road: just wait — the gap comes to us
      }
    }
  }

  // ── DRAW ──
  ctx.clearRect(0, 0, w, h);
  // background fill behind all rows
  ctx.fillStyle = '#0d1408';
  ctx.fillRect(0, 0, w, h);

  for (let rL = 0; rL < RCOUNT; rL++) {
    const ty = rowY(rL);
    const tp = layout[rL];
    if (tp === 'safe') {
      ctx.fillStyle = rL === 0 ? '#162910' : '#1a3312';
      ctx.fillRect(0, ty, w, cell);
      // grass strokes
      ctx.strokeStyle = 'rgba(60,130,30,0.35)'; ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c += 2) {
        ctx.beginPath(); ctx.moveTo(c*cell + cell*0.45, ty+cell*0.18);
        ctx.lineTo(c*cell + cell*0.45, ty+cell*0.72); ctx.stroke();
      }
    } else if (tp === 'river') {
      ctx.fillStyle = '#081e4a';
      ctx.fillRect(0, ty, w, cell);
      // shimmer strips
      ctx.fillStyle = `rgba(30,100,200,${0.18 + 0.08*Math.sin(t/300+rL)})`;
      for (let c = 0; c < COLS; c++) {
        if ((c + Math.floor(t/180)) % 4 === 0)
          ctx.fillRect(c*cell, ty + cell*0.38, cell*0.7, cell*0.22);
      }
    } else if (tp === 'road') {
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, ty, w, cell);
      // white dashes
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, cell*0.07);
      ctx.setLineDash([cell*0.38, cell*0.42]);
      ctx.beginPath(); ctx.moveTo(0, ty+cell*0.5); ctx.lineTo(w, ty+cell*0.5); ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // pellets
  ctx.fillStyle = '#ffe94d';
  for (let rL = 0; rL < RCOUNT; rL++) {
    if (!s.pellets[rL]) continue;
    for (let c = 0; c < COLS; c++)
      if (s.pellets[rL][c]) {
        ctx.beginPath();
        ctx.arc(c*cell+cell/2, rowY(rL)+cell/2, cell*0.12, 0, Math.PI*2); ctx.fill();
      }
  }

  // logs
  ctx.fillStyle = '#8B5C1A';
  for (const lane of s.logs) {
    const ly = rowY(lane.rL);
    for (const lg of lane.items) {
      const lx = lg.x * cell;
      const lw = cell * 2.6;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(lx, ly+cell*0.22, lw, cell*0.56, cell*0.14);
      else ctx.rect(lx, ly+cell*0.22, lw, cell*0.56);
      ctx.fill();
      ctx.strokeStyle = '#5c3a0e'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(lx+lw*0.14, ly+cell*0.5, cell*0.2, -Math.PI/2, Math.PI/2); ctx.stroke();
      ctx.beginPath(); ctx.arc(lx+lw*0.86, ly+cell*0.5, cell*0.2, Math.PI/2, -Math.PI/2); ctx.stroke();
    }
  }

  // cars (dark grey road, light grey tires)
  for (const lane of s.cars) {
    const cy2 = rowY(lane.rL);
    for (const car of lane.items) {
      const cx2 = car.x * cell;
      ctx.fillStyle = lane.dir > 0 ? '#c93030' : '#2d5ecc';
      if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(cx2, cy2+cell*0.14, cell*1.85, cell*0.72, cell*0.12); ctx.fill(); }
      else { ctx.fillRect(cx2, cy2+cell*0.14, cell*1.85, cell*0.72); }
      ctx.fillStyle = 'rgba(180,230,255,0.45)';
      ctx.fillRect(cx2+cell*0.28, cy2+cell*0.2, cell*0.78, cell*0.32);
      // light grey tires
      ctx.fillStyle = '#b0b0b0';
      ctx.beginPath(); ctx.arc(cx2+cell*0.35, cy2+cell*0.86, cell*0.12, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx2+cell*1.5,  cy2+cell*0.86, cell*0.12, 0, Math.PI*2); ctx.fill();
    }
  }

  // frog (fractional x — rides logs smoothly)
  _drawHopFrog(ctx, s.fx * cell + cell/2, rowY(s.frogL) + cell/2, cell * 0.3);

  ctx.globalAlpha = 1;
}

function _hopReset(s, COLS, RCOUNT, layout) {
  s.frogL = 0; s.fx = Math.floor(COLS / 2); s.ridingLog = null;
  for (let rL = 0; rL < RCOUNT; rL++)
    if (layout[rL] === 'safe') s.pellets[rL] = Array.from({length: COLS}, () => true);
}

function _drawHopFrog(ctx, fx, fy, fr) {
  // body — wide squat ellipse
  ctx.fillStyle = '#5ec74a';
  ctx.beginPath(); ctx.ellipse(fx, fy+fr*0.1, fr*1.1, fr*0.82, 0, 0, Math.PI*2); ctx.fill();
  // belly
  ctx.fillStyle = '#a8e89c';
  ctx.beginPath(); ctx.ellipse(fx, fy+fr*0.18, fr*0.65, fr*0.48, 0, 0, Math.PI*2); ctx.fill();
  // spots
  ctx.fillStyle = '#47a838';
  ctx.beginPath(); ctx.arc(fx-fr*0.5, fy+fr*0.1, fr*0.18, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(fx+fr*0.5, fy+fr*0.1, fr*0.18, 0, Math.PI*2); ctx.fill();
  // eye bulges
  ctx.fillStyle = '#4aab38';
  ctx.beginPath(); ctx.arc(fx-fr*0.42, fy-fr*0.72, fr*0.32, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(fx+fr*0.42, fy-fr*0.72, fr*0.32, 0, Math.PI*2); ctx.fill();
  // white sclera
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.arc(fx-fr*0.42, fy-fr*0.72, fr*0.26, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(fx+fr*0.42, fy-fr*0.72, fr*0.26, 0, Math.PI*2); ctx.fill();
  // pupils
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.arc(fx-fr*0.38, fy-fr*0.70, fr*0.14, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(fx+fr*0.38, fy-fr*0.70, fr*0.14, 0, Math.PI*2); ctx.fill();
  // back legs (webbed)
  ctx.strokeStyle = '#47a838'; ctx.lineWidth = fr*0.32; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(fx-fr*0.55, fy+fr*0.45); ctx.lineTo(fx-fr*1.05, fy+fr*1.0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx+fr*0.55, fy+fr*0.45); ctx.lineTo(fx+fr*1.05, fy+fr*1.0); ctx.stroke();
  // front legs
  ctx.lineWidth = fr*0.25;
  ctx.beginPath(); ctx.moveTo(fx-fr*0.5, fy+fr*0.1); ctx.lineTo(fx-fr*0.9, fy-fr*0.1); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(fx+fr*0.5, fy+fr*0.1); ctx.lineTo(fx+fr*0.9, fy-fr*0.1); ctx.stroke();
  // nostrils
  ctx.fillStyle = '#2d7a20';
  ctx.beginPath(); ctx.arc(fx-fr*0.18, fy-fr*0.18, fr*0.08, 0, Math.PI*2); ctx.fill();
  ctx.beginPath(); ctx.arc(fx+fr*0.18, fy-fr*0.18, fr*0.08, 0, Math.PI*2); ctx.fill();
}

function snakeAttract(ctx, w, h, t, world, s) {
  const cell = Math.max(10, Math.floor(w / 30));
  const cols = Math.floor(w / cell);
  const rows = Math.floor(h / cell);

  if (!s.snake || s.cols !== cols || s.rows !== rows) {
    s.cols = cols; s.rows = rows;
    s.snake = [[3, rows - 3], [2, rows - 3], [1, rows - 3]];
    s.dir = [1, 0];
    s.food = [Math.floor(cols / 2), Math.floor(rows / 2)];
    // bullets as float-position objects {x,y,vx,vy} for triple-spread fan
    s.bullets = [
      {x: 3.5, y: rows - 3, vx: 0,    vy: -1   },
      {x: 3.5, y: rows - 3, vx: -0.5, vy: -0.86},
      {x: 3.5, y: rows - 3, vx:  0.5, vy: -0.86},
    ];
    s.bricks = [];
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < cols; c++)
        s.bricks.push([c, r]);
    s.last = 0; s.flash = 0; s.perkTick = 0;
    // seed 2 perks pre-falling so the cassette screenshot sees them immediately
    s.perks = [
      {x: Math.floor(cols * 0.25), y: Math.floor(rows * 0.38), type: 'gun',    vy: 0.14},
      {x: Math.floor(cols * 0.72), y: Math.floor(rows * 0.55), type: 'life',   vy: 0.11},
      {x: Math.floor(cols * 0.50), y: Math.floor(rows * 0.25), type: 'rapid',  vy: 0.16},
    ];
  }

  const stepMs = TURBO ? 38 : 60;
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
      s.snake = [[3, rows - 3], [2, rows - 3], [1, rows - 3]];
      s.dir = [1, 0];
    } else {
      s.snake.unshift([nx, ny]);
      if (nx === s.food[0] && ny === s.food[1]) {
        s.food = [1 + Math.floor(Math.random() * (cols - 2)), 4 + Math.floor(Math.random() * (rows - 7))];
        // TRIPLE SHOT — 3-bullet fan spread (orange, gun tier 3)
        const sx = nx + 0.5, sy = ny;
        s.bullets.push(
          {x: sx, y: sy, vx: 0,    vy: -1   },
          {x: sx, y: sy, vx: -0.5, vy: -0.86},
          {x: sx, y: sy, vx:  0.5, vy: -0.86},
        );
        if (s.snake.length > 20) s.snake.length = 12;
      } else {
        s.snake.pop();
      }
    }

    // move bullets (float), blast bricks on impact
    s.bullets = s.bullets.filter(b => {
      b.x += b.vx; b.y += b.vy;
      const bc = Math.round(b.x - 0.5), br = Math.round(b.y);
      const hit = s.bricks.findIndex(k => k[0] === bc && k[1] === br);
      if (hit >= 0) { s.bricks.splice(hit, 1); s.flash = t; return false; }
      return b.y >= 0 && b.x >= -1 && b.x <= cols + 1;
    });

    // wall slowly heals
    if (Math.random() < 0.12 && s.bricks.length < cols * 3) {
      const c = Math.floor(Math.random() * cols), r = Math.floor(Math.random() * 3);
      if (!s.bricks.some(k => k[0] === c && k[1] === r)) s.bricks.push([c, r]);
    }

    // falling perks — spawn every 35 ticks, max 4 on screen
    s.perkTick++;
    if (s.perkTick > 35 && s.perks.length < 4) {
      s.perkTick = 0;
      const types = ['gun', 'life', 'rapid', 'magnet'];
      s.perks.push({x: 2 + Math.floor(Math.random() * (cols - 4)), y: 3,
                    type: types[Math.floor(Math.random() * types.length)], vy: 0.1 + Math.random() * 0.08});
    }
    s.perks = s.perks.filter(p => { p.y += p.vy; return p.y < rows - 1; });
  }

  // ── DRAW ──
  ctx.clearRect(0, 0, w, h);
  const pad = Math.max(1, Math.round(cell * 0.1));

  // bricks
  ctx.fillStyle = world.dim;
  for (const [c, r] of s.bricks)
    ctx.fillRect(c * cell + pad, r * cell + pad, cell - pad * 2, cell - pad * 2);

  // triple-spread bullets — orange (#ff7700 = Triple gun color)
  ctx.fillStyle = '#ff7700';
  for (const b of s.bullets)
    ctx.fillRect(b.x * cell + cell * 0.35, b.y * cell, cell * 0.3, cell * 0.85);

  // snake body
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

  // falling perks
  const PCOL = {gun: '#ff7700', life: '#ff3355', rapid: '#00ccff', magnet: '#bf5af2'};
  const PLAB = {gun: 'G', life: '♥', rapid: '⚡', magnet: 'M'};
  for (const p of s.perks) {
    const px = p.x * cell, py = p.y * cell, ps = cell * 0.82;
    ctx.fillStyle = PCOL[p.type]; ctx.globalAlpha = 0.92;
    ctx.fillRect(px + (cell - ps) / 2, py + (cell - ps) / 2, ps, ps);
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.max(7, Math.round(cell * 0.52))}px monospace`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(PLAB[p.type], px + cell / 2, py + cell / 2);
  }
  ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';

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

/* TOMB-HUNT attract — auto-running Lara jumps boulders, collects artifacts, swings vines */
function tombHuntAttract(ctx, w, h, t, world, s) {
  const SPEED  = w * 0.00078;
  const GR     = 0.44;
  const JY     = -10;
  const FLOOR  = h * 0.78;
  const PX     = w * 0.25;

  if (!s.init) {
    s.init = true; s.last = t; s.frame = 0;
    s.py = FLOOR - 28; s.pvy = 0;
    s.boulders  = [{ x: w * 0.78, r: 18, angle: 0 }, { x: w * 1.45, r: 20, angle: 0 }];
    s.artifacts = [
      { x: w * 0.60, y: FLOOR - 52, bob: 0 },
      { x: w * 1.20, y: FLOOR - 44, bob: 1.8 },
    ];
    s.vines = [{ x: w * 1.05 }, { x: w * 1.70 }];
    s.particles = [];
    s.bgTrees = Array.from({length: 9}, () => ({
      x: Math.random() * w * 1.6,
      h: 55 + Math.random() * 90,
      w: 14 + Math.random() * 22,
      col: ['#1a3d0f','#15300b','#223d10'][Math.floor(Math.random()*3)],
    }));
  }

  const dt = Math.min(t - s.last, 32); s.last = t; s.frame++;
  const bgStep = SPEED * dt * 0.22;

  // boulders
  for (const b of s.boulders) {
    b.x -= SPEED * dt * 1.12; b.angle += 0.058;
    if (b.x < -35) b.x = w + 35 + Math.random() * 120;
  }
  // artifacts
  for (const a of s.artifacts) {
    a.x -= SPEED * dt; a.bob += 0.05;
    if (a.x < -20) { a.x = w + 50 + Math.random() * 80; a.y = FLOOR - 40 - Math.random() * 55; a.bob = 0; }
    // collect
    if (Math.hypot(PX - a.x, (s.py + 18) - a.y) < 28) {
      for (let j = 0; j < 7; j++) {
        const ang = j / 7 * Math.PI * 2;
        s.particles.push({ x: a.x, y: a.y, vx: Math.cos(ang)*2.6, vy: Math.sin(ang)*2.6-1, alpha: 1 });
      }
      a.x = w + 60 + Math.random() * 100; a.y = FLOOR - 40 - Math.random() * 55; a.bob = 0;
    }
  }
  // vines
  for (const v of s.vines) { v.x -= SPEED * dt; if (v.x < -15) v.x = w + 20 + Math.random() * 80; }
  // particles
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.16; p.alpha -= 0.033;
    if (p.alpha <= 0) s.particles.splice(i, 1);
  }
  // physics + AI jump
  s.pvy += GR;
  s.py  += s.pvy * dt / 16;
  if (s.py >= FLOOR - 28) { s.py = FLOOR - 28; s.pvy = 0; }
  const nearest = s.boulders.filter(b => b.x > PX + 12).sort((a,b) => a.x-b.x)[0];
  if (nearest && nearest.x - PX < 96 && s.py >= FLOOR - 30) s.pvy = JY;

  // ── DRAW ──
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#060802'); sky.addColorStop(1, '#180e02');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);

  // bg trees
  for (const tr of s.bgTrees) {
    tr.x -= bgStep; if (tr.x < -tr.w - 4) tr.x = w + tr.w;
    ctx.globalAlpha = 0.38; ctx.fillStyle = tr.col;
    ctx.fillRect(tr.x - 4, FLOOR - tr.h, 8, tr.h);
    ctx.beginPath(); ctx.arc(tr.x, FLOOR - tr.h, tr.w * 0.52, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(tr.x - tr.w*0.3, FLOOR - tr.h + 10, tr.w*0.38, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(tr.x + tr.w*0.3, FLOOR - tr.h + 12, tr.w*0.36, 0, Math.PI*2); ctx.fill();
  }
  ctx.globalAlpha = 1;

  // temple pillar silhouettes
  ctx.globalAlpha = 0.14; ctx.fillStyle = '#6b5320';
  for (let px = 50; px < w; px += 190) {
    const ph = Math.min(FLOOR * 0.58, 140);
    ctx.fillRect(px - 10, FLOOR - ph, 20, ph);
    ctx.fillRect(px - 16, FLOOR - ph - 11, 32, 13);
  }
  ctx.globalAlpha = 1;

  // vines
  for (const v of s.vines) {
    ctx.strokeStyle = '#2d5a1e'; ctx.lineWidth = 3; ctx.setLineDash([6,4]);
    ctx.beginPath(); ctx.moveTo(v.x, 0); ctx.lineTo(v.x, FLOOR - 18); ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 0.75; ctx.fillStyle = '#3a7a2a';
    [0.32, 0.56, 0.72].forEach(f => {
      ctx.beginPath(); ctx.arc(v.x, h * f, 6, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(v.x - 7, h * f + 3, 4, 0, Math.PI*2); ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  // ground
  ctx.fillStyle = '#0a1a07'; ctx.fillRect(0, FLOOR, w, h - FLOOR);
  ctx.strokeStyle = '#1d4a12'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, FLOOR); ctx.lineTo(w, FLOOR); ctx.stroke();
  // ground texture
  ctx.fillStyle = '#162a10';
  for (let gx = (-(s.frame * SPEED * 12) % 28); gx < w; gx += 28) ctx.fillRect(gx, FLOOR + 4, 10, 4);

  // artifacts (golden idols)
  for (const a of s.artifacts) {
    const ay = a.y + Math.sin(a.bob) * 5;
    ctx.save(); ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 14;
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(a.x - 6, ay - 12, 12, 16);
    ctx.beginPath(); ctx.arc(a.x, ay - 12, 8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#b8860b'; ctx.fillRect(a.x - 8, ay + 4, 16, 4);
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.arc(a.x - 2, ay - 14, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // boulders
  for (const b of s.boulders) {
    ctx.save(); ctx.translate(b.x, FLOOR - b.r); ctx.rotate(b.angle);
    const gr2 = ctx.createRadialGradient(-b.r*0.3,-b.r*0.3,b.r*0.1,0,0,b.r);
    gr2.addColorStop(0,'#8a7a6a'); gr2.addColorStop(1,'#3a2a1a');
    ctx.fillStyle = gr2; ctx.beginPath(); ctx.arc(0,0,b.r,0,Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-b.r*0.2,-b.r*0.5); ctx.lineTo(b.r*0.1,b.r*0.3); ctx.stroke();
    ctx.restore();
  }

  // Lara character
  const pfl = s.frame * 0.2; const pH = 28;
  ctx.save(); ctx.translate(PX, s.py + pH);
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath(); ctx.ellipse(0, 0, 11, 4, 0, 0, Math.PI*2); ctx.fill();
  ctx.strokeStyle = '#5a3010'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(-3,-8); ctx.lineTo(-3+Math.sin(pfl)*6,0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(3,-8); ctx.lineTo(3-Math.sin(pfl)*6,0); ctx.stroke();
  ctx.fillStyle = '#6b8a3a'; ctx.fillRect(-6,-pH+10,12,pH-18);
  ctx.strokeStyle = '#5a7830';
  ctx.beginPath(); ctx.moveTo(6,-pH+16); ctx.lineTo(6+Math.cos(pfl)*7,-pH+16+Math.sin(pfl)*5); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(-6,-pH+16); ctx.lineTo(-6-Math.cos(pfl)*7,-pH+16-Math.sin(pfl)*5); ctx.stroke();
  ctx.fillStyle = '#c49a6c'; ctx.beginPath(); ctx.arc(0,-pH+8,8,0,Math.PI*2); ctx.fill();
  ctx.fillStyle = '#4a2800'; ctx.fillRect(-8,-pH+6,16,5);
  ctx.beginPath(); ctx.arc(0,-pH+6,8,Math.PI,0); ctx.fill();
  const bsw = s.pvy < -2 ? -0.28 : s.pvy > 2 ? 0.18 : 0;
  ctx.strokeStyle = '#8b5e3c'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(-2,-pH+5);
  ctx.quadraticCurveTo(-12+bsw*14,-pH+13,-14+bsw*19,-pH+21);
  ctx.stroke();
  ctx.restore();

  // gold particles
  for (const p of s.particles) {
    ctx.save(); ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = '#ffd700'; ctx.shadowColor = '#ffd700'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }
}


function hydrateHiScores(games) {
  /* Real leaderboard numbers on every cassette. One request per game (there is no bulk
     endpoint), fired in parallel AFTER the cabinets are on screen, so a slow or dead
     scores API costs nothing visually — the slot simply stays empty. */
  games.forEach(function (g) {
    var slot = document.querySelector('.cab-hi[data-hi="' + g.id + '"]');
    // Match on the data attribute only — the element's class is 'hiscore-tag', and
    // hard-coding a class here is how this selector silently missed on the first pass.
    var hsTag = document.querySelector('[data-hs="' + g.id + '"]');
    if (!slot && !hsTag) return;
    fetch('/api/scores?game=' + encodeURIComponent(g.id))
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (d) {
        var top = d && d.scores && d.scores.length ? d.scores[0] : null;
        if (!top || !top.s) return;                       // no score yet: show nothing
        var n = Number(top.s).toLocaleString('en-GB');
        if (slot) slot.textContent = 'HI ' + n
                         + (top.n ? ' · ' + String(top.n).toUpperCase() : '');
        // The attract overlay gets the same authoritative number. It is only ever
        // RAISED to the server value — a local best higher than the board (an
        // unsubmitted run) is left alone rather than being silently overwritten.
        if (hsTag) {
          var cur = parseInt(String(hsTag.textContent).replace(/[^0-9]/g, ''), 10) || 0;
          if (Number(top.s) >= cur) hsTag.textContent = 'HI-SCORE ' + n;
        }
      })
      .catch(function () {});
  });
}

function buildNextStrip(games) {
  const upcoming = games
    .filter(g => !isUnlocked(g.releaseDate))
    .sort((a, b) => new Date(a.releaseDate) - new Date(b.releaseDate))[0];
  if (!upcoming) return;

  // The "next drop" strip only exists on the main arcade page. /arcade and /patreon
  // have no such element, so these three lines threw on null and killed the whole
  // init — the page rendered "GAME OVER. ARCADE DATA FAILED TO LOAD." with perfectly
  // valid JSON sitting there (Osimo 2026-07-29). A shared init must never hard-fail
  // on a page that simply lacks an optional element.
  const nName = document.getElementById('nextName');
  const nDate = document.getElementById('nextDate');
  const nStrip = document.getElementById('nextStrip');
  if (!nName || !nDate || !nStrip) return;
  nName.textContent = upcoming.name.toUpperCase();
  nDate.textContent = shortDate(upcoming.releaseDate);
  nStrip.hidden = false;
}

/* ── Socials ──────────────────────────────────────────────── */

// real arcade-button photos (cut from Osimo's reference, recoloured)
// Coin art per link. X took YouTube's red dome (2026-08-09): YouTube is PER-CHANNEL and
// now lives inside the channel page, while this row is NETWORK-level — Osimo: "should be
// something outside of channel one, something that covers all channels, like Kofi and merch
// can be used by any channel followers". One X account fronts the whole network.
const COIN_IMGS = { Shop: 'yellow', X: 'red', Patreon: 'orange', KoFi: 'blue' };

function buildSocials(social) {
  const row = document.getElementById('socialRow');
  social.forEach(app => {
    const a = document.createElement('a');
    a.className = 'coin-btn';
    a.href = app.url;
    a.target = '_blank';
    a.rel = 'noopener';
    const img = COIN_IMGS[app.label] || 'yellow';
    a.innerHTML = '<img class="dome" alt="" src="assets/buttons/btn-' + img + '.png">' +
                  '<span class="tag">' + app.name.toUpperCase() + '</span>';
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
  const sign = document.getElementById('sign');
  if (sign) sign.addEventListener('click', () => {
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

/* ── Global play stats (all visitors, via /api/plays) ─────── */

let GLOBAL_PLAYS = {};

async function fetchGlobalPlays() {
  try {
    const r = await fetch('/api/plays', { cache: 'no-store' });
    if (r.ok) GLOBAL_PLAYS = await r.json();
  } catch { /* stats are decoration; the arcade works without them */ }
}

function reportPlay(id) {
  const payload = new Blob([JSON.stringify({ id })], { type: 'application/json' });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/plays', payload);
  } else {
    fetch('/api/plays', { method: 'POST', body: JSON.stringify({ id }), keepalive: true }).catch(() => {});
  }
}

/* ── Init ─────────────────────────────────────────────────── */

function bombGardenAttract(ctx, w, h, t, world, s) {
  if (!s.init) {
    s.init = true; s.last = t;
    const CELL = Math.max(10, Math.floor(w / 13));
    const cols = Math.floor(w / CELL), rows = Math.floor(h / CELL) | 1;
    s.CELL = CELL; s.cols = cols; s.rows = rows;
    // Static maze grid
    s.grid = [];
    for (let r = 0; r < rows; r++) {
      s.grid[r] = [];
      for (let c = 0; c < cols; c++) {
        s.grid[r][c] = (r % 2 === 0 && c % 2 === 0) ? 1 : (r % 2 === 0 && Math.random() < 0.55 ? 2 : 0);
      }
    }
    s.bomb = { r: Math.floor(rows / 2), c: 2, fuseEnd: t + 2200 };
    s.exps = [];
    s.zombies = [
      { r: 1, cx: cols - 0.8 }, { r: 3, cx: cols - 0.4 },
      { r: rows - 2, cx: cols - 1.1 },
    ].filter(z => z.r < rows);
    s.plant = { r: Math.floor(rows / 2) % 2 === 1 ? Math.floor(rows / 2) : Math.floor(rows / 2) - 1, c: 4 };
    s.sun = { cx: 5, ry: -0.4 };
    s.frame = 0;
  }

  const dt = Math.min(t - s.last, 32); s.last = t; s.frame++;
  const CL = s.CELL;

  // BG
  ctx.fillStyle = '#070d04'; ctx.fillRect(0, 0, w, h);

  // Grid
  for (let r = 0; r < s.rows; r++) for (let c = 0; c < s.cols; c++) {
    const x = c * CL, y = r * CL;
    ctx.fillStyle = r % 2 === 1 ? '#0f1f08' : '#0c1600';
    ctx.fillRect(x + 1, y + 1, CL - 2, CL - 2);
    if (s.grid[r][c] === 1) { ctx.fillStyle = '#383838'; ctx.fillRect(x + 2, y + 2, CL - 4, CL - 4); }
    else if (s.grid[r][c] === 2) { ctx.fillStyle = '#7a5818'; ctx.fillRect(x + 2, y + 2, CL - 4, CL - 4); }
  }

  // Plant (peashooter icon substitute — green circle)
  const pr = s.plant.r, pc = s.plant.c;
  if (pr < s.rows && pc < s.cols) {
    ctx.beginPath(); ctx.arc(pc * CL + CL / 2, pr * CL + CL / 2, CL * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#3d7a28'; ctx.fill();
    ctx.strokeStyle = '#7bba3f'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  // Bomb
  const bx = s.bomb.c * CL + CL / 2, by = s.bomb.r * CL + CL / 2, br = CL * 0.38;
  const frac = Math.max(0, (s.bomb.fuseEnd - t) / 2200);
  ctx.beginPath(); ctx.arc(bx, by, br, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1a1a'; ctx.fill();
  ctx.beginPath(); ctx.arc(bx, by, br + 2, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * (1 - frac));
  ctx.strokeStyle = frac < 0.33 ? '#ff2200' : '#ff8800'; ctx.lineWidth = 2; ctx.stroke();
  if (Math.sin(t / 70) > 0) {
    ctx.beginPath(); ctx.arc(bx + br * 0.55, by - br * 0.65, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = '#ff8800'; ctx.shadowColor = '#ff8800'; ctx.shadowBlur = 6;
    ctx.fill(); ctx.shadowBlur = 0;
  }

  // Trigger explosion when fuse done
  if (t >= s.bomb.fuseEnd && !s.exploded) {
    s.exploded = true;
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    dirs.forEach(([dr, dc]) => {
      for (let d = 0; d <= 2; d++) s.exps.push({ r: s.bomb.r + dr*d, c: s.bomb.c + dc*d, born: t, dur: 450 });
    });
    s.exps.push({ r: s.bomb.r, c: s.bomb.c, born: t, dur: 450 });
    // Reset for loop
    setTimeout(() => {
      s.exploded = false; s.exps = [];
      s.bomb = { r: s.bomb.r, c: s.bomb.c, fuseEnd: performance.now() + 2200 };
    }, 1200);
  }

  // Explosions
  for (const e of s.exps) {
    const age = t - e.born, frac2 = age / e.dur; if (frac2 >= 1) continue;
    ctx.globalAlpha = 1 - frac2;
    ctx.beginPath(); ctx.arc(e.c * CL + CL / 2, e.r * CL + CL / 2, CL * (0.3 + frac2 * 0.3), 0, Math.PI * 2);
    ctx.fillStyle = e.r === s.bomb.r && e.c === s.bomb.c ? '#ffee00' : '#ff8800'; ctx.fill();
    ctx.globalAlpha = 1;
  }

  // Zombies walking left
  for (const z of s.zombies) {
    z.cx -= 0.012 * (dt / 50);
    if (z.cx < -1) z.cx = s.cols + 0.5;
    const zx = z.cx * CL, zy = z.r * CL;
    ctx.fillStyle = '#7aad54'; ctx.fillRect(zx + CL * 0.25, zy + CL * 0.3, CL * 0.5, CL * 0.5);
    ctx.beginPath(); ctx.arc(zx + CL / 2, zy + CL * 0.25, CL * 0.22, 0, Math.PI * 2);
    ctx.fillStyle = '#90c060'; ctx.fill();
    ctx.fillStyle = '#cc1100';
    ctx.fillRect(zx + CL * 0.35, zy + CL * 0.18, CL * 0.1, CL * 0.08);
    ctx.fillRect(zx + CL * 0.55, zy + CL * 0.18, CL * 0.1, CL * 0.08);
  }

  // Falling sun coin
  s.sun.ry += 0.025 * (dt / 50);
  if (s.sun.ry > s.rows + 0.5) s.sun.ry = -0.5;
  const sx = s.sun.cx * CL + CL / 2, sy = s.sun.ry * CL + CL / 2;
  ctx.beginPath(); ctx.arc(sx, sy, CL * 0.22, 0, Math.PI * 2);
  ctx.fillStyle = '#f5c800'; ctx.shadowColor = '#f5c800'; ctx.shadowBlur = 8; ctx.fill(); ctx.shadowBlur = 0;

  // Genre label
  ctx.font = `bold ${Math.max(9, Math.floor(w * 0.055))}px 'Bungee',sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(61,122,40,0.55)';
  ctx.fillText('BOMB GARDEN', w / 2, h * 0.92);
}

async function init() {
  setupFullscreenUI();
  setupTurbo();

  // /wip lab shows the SAME cabinet cassettes as the real site (Osimo 2026-06-16), from wip-games.json
  const WIP = document.body.dataset.wip === '1';
  const PATREON = document.body.dataset.patreon === '1';
  const ARCADE = document.body.dataset.arcade === '1';
  // Members' arcade: every cabinet playable, ranked by plays. Separate from the public
  // /arcade, which shows 2 free cabinets plus locked teasers.
  const PARCADE = document.body.dataset.parcade === '1';
  try {
    // /arcade — a small FREE set, no paywall (Osimo 2026-07-29: "this will be where a
    // few games will reside for everyone no pay wall"). Same cabinets and attract
    // screens as everywhere else, just its own short curated list.
    const src = PARCADE ? 'patreon-arcade-games.json'
              : ARCADE ? 'arcade-games.json'
              : WIP ? 'wip-games.json'
              : PATREON ? 'patreon-games.json'
              : 'games.json';
    const [resp] = await Promise.all([
      fetch(src + '?v=' + Date.now()),
      fetchGlobalPlays(),
    ]);
    const data = await resp.json();
    const games = data.games || [];

    // main arcade: only unlocked, most-played first. WIP: ai_improved floats to top. Patreon: most-played first.
    // PINNED FIRST. The Patreon page sorts by global plays, so a brand-new cabinet with
    // 0 plays sinks to the bottom regardless of the JSON order — which is exactly why
    // reordering patreon-games.json alone changed nothing for Face Lab and STL Lab
    // (Osimo 2026-07-29: "both cassettes still low down in the page"). A `pinned: true`
    // entry now floats above the play ranking; everything else is untouched.
    const live = PARCADE
      // RANK LIVE, not from the file. This used to be `[...games]` with the comment
      // "already ranked by plays in the JSON" — true on the day someone hand-ordered it
      // and wrong ever after, because plays keep moving and the file does not. Osimo
      // 2026-07-29: "pin-vaders has more than [doom-3d], it should have moved up" — it
      // was pinned to last place by file order while sitting 15 plays to doom-3d's 14.
      // Same comparator as the Patreon hub so both members' surfaces agree.
      ? [...games].sort((a, b) =>
          (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
          (GLOBAL_PLAYS[b.id] || 0) - (GLOBAL_PLAYS[a.id] || 0))
      : ARCADE
      ? [...games]                      // curated order — exactly as listed, no play re-rank
      : PATREON
      ? [...games].sort((a, b) =>
          (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) ||
          (GLOBAL_PLAYS[b.id] || 0) - (GLOBAL_PLAYS[a.id] || 0))
      : WIP
        ? [...games].sort((a, b) => (b.ai_improved ? 1 : 0) - (a.ai_improved ? 1 : 0))
        : games.filter(g => isUnlocked(g.releaseDate))
               .sort((a, b) => (GLOBAL_PLAYS[b.id] || 0) - (GLOBAL_PLAYS[a.id] || 0) || a.week - b.week);

    const hall = document.getElementById('cabinets');
    // /patreon is a HUB now — three cassettes, no cabinets grid — so #cabinets is absent
    // and every append below threw, which the catch turned into "ARCADE DATA FAILED TO
    // LOAD" over a perfectly good page. Same shape as the buildNextStrip null-crash:
    // a shared init must degrade on a page that lacks an optional element, not die.
    if (!hall) {
      if (data.social && data.social.length) buildSocials(data.social);
      return;
    }
    if (live.length === 0) {
      hall.innerHTML = '<p class="hall-empty">' + (WIP
        ? 'NO GAMES IN THE LAB RIGHT NOW.'
        : PATREON ? 'NO GAMES HERE YET.<br>CHECK BACK SOON.'
        // Main arcade's empty state carries the support pitch instead of a placeholder
        // (Osimo 2026-07-29: "wanted it instead of the arcade coming soon message, in the
        // font of the arcade coming soon message, don't clutter the webpage footer").
        // Same .hall-empty Bungee treatment, so it reads as part of the cabinet floor.
        // Scoped to THIS hall on purpose. It used to read "EVERY CABINET IS FREE.
        // ALWAYS WILL BE." as a site-wide promise, which the site does not keep — the
        // Patreon hall holds 7 members-only cabinets (Osimo 2026-07-29: "not entirely
        // true as a tonne of them are behind a pay wall, adapt"). The free arcade IS
        // free forever; saying so accurately costs nothing and claiming more than we
        // deliver on our own shop front costs trust.
        : 'Some cabinets are free.<br>'
          + 'Others help keep the \u{1F4A1} on.<br>'
          + 'If you\'d like to support us<br>'
          + 'Patreon &amp; Ko-fi \u{1F517}'
          + '<span class="hall-arrow">&#x2193;</span>') + '</p>';
    } else {
      live.forEach(g => {
        // WIP + Patreon: load AI-improved version if available
        if ((WIP || PATREON) && g.ai_improved && g.ai_file) g.url = g.ai_file;
        hall.appendChild(buildCabinet(g));
      });
      // Osimo 2026-08-01: the CSS .cab entrance (cabrise) only ever staggered the
      // first 2 cards (:nth-child(1)/(2)) — every cabinet after that popped in on
      // the same frame, no cascade. Cabinet count is only known here at render
      // time, so JS is the right place to extend the SAME rise (translateY 28px,
      // 0.7s, same 0.45s start + the existing 0.17s gap between cards 1 and 2)
      // across however many cabinets this hall actually has. Reduced-motion and a
      // missing GSAP CDN both leave the original CSS keyframe alone untouched.
      if (typeof gsap !== 'undefined' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const cabs = hall.querySelectorAll('.cab');
        cabs.forEach(c => { c.style.animation = 'none'; });
        gsap.fromTo(cabs, {y: 28, opacity: 0}, {
          y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
          delay: 0.45, stagger: 0.17,
        });
      }
    }

    if (!WIP && !PATREON) {
      buildNextStrip(data.games);
    }
    hydrateHiScores(live);
    if (data.social && data.social.length) {
      buildSocials(data.social);
    }
  } catch (err) {
    console.error('games.json failed:', err);
    const _hall = document.getElementById('cabinets');
    if (_hall) _hall.innerHTML =
      '<p class="hall-empty">GAME OVER.<br>ARCADE DATA FAILED TO LOAD.<br>PRESS REFRESH TO CONTINUE.</p>';
  }
}

/* CRUSHTRIS attract — a MINI SELF-PLAYING GAME so the cassette looks like the real
   thing (Osimo 2026-07-02): candy tetrominoes with translucent square wrappers fall
   onto a stack, full rows flash + clear, stack resets when it tops out. */
function candyTrisAttract(ctx, w, h, t, world, s) {
  const COLS = 8;
  const CELL = Math.max(8, Math.floor(w / COLS));
  const ROWS = Math.floor(h * 0.86 / CELL);
  const OX = Math.floor((w - COLS * CELL) / 2);
  // real game palette (body/light/dark per colour — matches candy-tris.html CANDY[])
  const PAL = [
    ['#FFD700','#FFE955','#806800'], ['#FF8C00','#FFB344','#7a4300'],
    ['#4CAF50','#80e080','#1a4a1e'], ['#1a5ae0','#5599ff','#081a80'],
    ['#9020c8','#cc66ff','#44007a'], ['#e01228','#ff5566','#7a000e'],
  ];
  const SHAPES = [
    [[0,0],[1,0],[2,0],[3,0]],      // I
    [[0,0],[1,0],[0,1],[1,1]],      // O
    [[0,0],[1,0],[2,0],[1,1]],      // T
    [[0,0],[0,1],[1,1],[2,1]],      // J
    [[1,0],[2,0],[0,1],[1,1]],      // S
  ];
  function newPiece() {
    const cells = SHAPES[Math.floor(Math.random() * SHAPES.length)];
    const maxC = Math.max(...cells.map(p => p[0]));
    return {
      cells,
      col: Math.floor(Math.random() * (COLS - maxC - 1)),
      row: -2,
      colors: cells.map(() => Math.floor(Math.random() * PAL.length)),
    };
  }
  if (!s.init || s.cell !== CELL || s.rows !== ROWS) {
    s.init = true; s.cell = CELL; s.rows = ROWS; s.last = t; s.drop = 0;
    s.board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
    // pre-seed a partial stack so it reads as mid-game instantly
    for (let r = ROWS - 3; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        if (Math.random() < 0.62) s.board[r][c] = Math.floor(Math.random() * PAL.length);
    s.piece = newPiece(); s.flash = null; s.flashT = 0; s.sparks = [];
  }
  const dt = Math.min(t - s.last, 48); s.last = t;

  // ── tick: gravity every 260ms ──
  s.drop += dt;
  if (s.flash) {
    s.flashT += dt;
    if (s.flashT > 320) {                    // remove flashed rows, drop stack
      for (const fr of s.flash) { s.board.splice(fr, 1); s.board.unshift(Array(COLS).fill(null)); }
      s.flash = null;
    }
  } else if (s.drop > 260) {
    s.drop = 0;
    const p = s.piece;
    const collides = (dr) => p.cells.some(([dx,dy]) => {
      const r = p.row + dy + dr, c = p.col + dx;
      return r >= ROWS || (r >= 0 && s.board[r][c] !== null);
    });
    if (!collides(1)) { p.row++; }
    else {
      // lock
      p.cells.forEach(([dx,dy],i) => {
        const r = p.row + dy, c = p.col + dx;
        if (r >= 0 && r < ROWS) s.board[r][c] = p.colors[i];
      });
      // full rows → flash + sparkle
      const full = [];
      for (let r = 0; r < ROWS; r++) if (s.board[r].every(v => v !== null)) full.push(r);
      if (full.length) {
        s.flash = full; s.flashT = 0;
        for (const fr of full) for (let c = 0; c < COLS; c++)
          s.sparks.push({x: OX + c*CELL + CELL/2, y: fr*CELL + CELL/2,
                         vx: (Math.random()-0.5)*2.2, vy: -Math.random()*2 - 0.5,
                         life: 500, color: PAL[s.board[fr][c] ?? 0][1]});
      }
      // top-out → fresh board
      if (s.board[1].some(v => v !== null)) {
        s.board = Array.from({length: ROWS}, () => Array(COLS).fill(null));
      }
      s.piece = newPiece();
    }
  }

  // ── draw ──
  ctx.fillStyle = '#0a0012'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,105,180,0.08)'; ctx.lineWidth = 0.5;
  for (let c = 0; c <= COLS; c++) { ctx.beginPath(); ctx.moveTo(OX+c*CELL,0); ctx.lineTo(OX+c*CELL,ROWS*CELL); ctx.stroke(); }
  for (let r = 0; r <= ROWS; r++) { ctx.beginPath(); ctx.moveTo(OX,r*CELL); ctx.lineTo(OX+COLS*CELL,r*CELL); ctx.stroke(); }

  // one candy cell — translucent square wrapper + glossy candy, echoing the game
  function drawCell(x, y, ci, bright) {
    const [body, light, dark] = PAL[ci];
    ctx.globalAlpha = bright ? 0.9 : 0.42;
    ctx.fillStyle = dark; ctx.fillRect(x+0.5, y+0.5, CELL-1, CELL-1);
    const b = Math.max(1, CELL*0.12);
    ctx.fillStyle = body; ctx.fillRect(x+b, y+b, CELL-b*2, CELL-b*2);
    ctx.globalAlpha = 1;
    const r = CELL*0.32, cx = x+CELL/2, cy = y+CELL/2;
    const g = ctx.createRadialGradient(cx-r*0.35, cy-r*0.35, r*0.1, cx, cy, r);
    g.addColorStop(0, light); g.addColorStop(0.55, body); g.addColorStop(1, dark);
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2); ctx.fillStyle = g; ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx-r*0.3, cy-r*0.4, r*0.3, r*0.16, -0.5, 0, Math.PI*2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fill();
  }

  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++) {
      if (s.board[r][c] === null) continue;
      if (s.flash && s.flash.includes(r)) {
        ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5*Math.sin(s.flashT/40)})`;
        ctx.fillRect(OX + c*CELL, r*CELL, CELL-1, CELL-1);
      } else drawCell(OX + c*CELL, r*CELL, s.board[r][c], false);
    }
  // falling piece — brighter than the stack so the eye tracks it
  for (let i = 0; i < s.piece.cells.length; i++) {
    const [dx,dy] = s.piece.cells[i];
    const r = s.piece.row + dy, c = s.piece.col + dx;
    if (r >= 0) drawCell(OX + c*CELL, r*CELL, s.piece.colors[i], true);
  }
  // sparks
  s.sparks = s.sparks.filter(sp => (sp.life -= dt) > 0);
  for (const sp of s.sparks) {
    sp.x += sp.vx; sp.y += sp.vy; sp.vy += 0.06;
    ctx.globalAlpha = Math.max(0, sp.life / 500);
    ctx.fillStyle = sp.color;
    ctx.fillRect(sp.x, sp.y, 2, 2);
  }
  ctx.globalAlpha = 1;

  // Genre label
  ctx.font = `bold ${Math.max(9, Math.floor(w * 0.055))}px 'Bungee',sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255,105,180,0.55)';
  ctx.fillText('CRUSHTRIS', w/2, h * 0.94);
}

/* FACE LAB attract — a Jimmy face being live-edited: cursor roams, toggles dots,
   face morphs between smile / surprise / hearts. */
// STL LAB — a print bed building an object layer by layer, then the finished piece
// rotating as wireframe. Procedural like every other cassette: no bitmap, so the
// arcade theme holds (Osimo 2026-07-29: "follow the style of other cassettes so the
// theme persists"). Green = filament/printer, distinct from face-lab's cyan.
function stlLabAttract(ctx, w, h, t, world, s) {
  if (!s.init) { s.init = true; s.t0 = t; }
  const INK = world.ink || '#b8ff5c', DIM = world.dim || '#3d5c18';
  const el = (t - s.t0) / 1000;
  const CYCLE = 9;                       // print for 6s, admire for 3s
  const p = el % CYCLE;
  const cx = w / 2, cy = h * 0.56, R = Math.min(w, h) * 0.26;

  ctx.fillStyle = world.pit || '#080d04';
  ctx.fillRect(0, 0, w, h);

  // print bed
  ctx.strokeStyle = DIM; ctx.lineWidth = Math.max(1, w * 0.004);
  ctx.beginPath();
  ctx.moveTo(cx - R * 1.5, cy + R * 0.95);
  ctx.lineTo(cx + R * 1.5, cy + R * 0.95);
  ctx.stroke();
  for (let i = -3; i <= 3; i++) {
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(cx + i * R * 0.5, cy + R * 0.95);
    ctx.lineTo(cx + i * R * 0.78, cy + R * 1.25);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const LAYERS = 26;
  const printing = p < 6;
  const built = printing ? Math.floor((p / 6) * LAYERS) : LAYERS;
  const spin = printing ? 0 : (p - 6) * 1.1;

  // the object: a mug — callback to Joe's line on this cassette
  for (let L = 0; L < built; L++) {
    const fy = L / LAYERS;
    const y = cy + R * 0.9 - fy * R * 1.6;
    const rad = R * (0.52 - 0.05 * Math.sin(fy * Math.PI));
    ctx.strokeStyle = INK;
    ctx.globalAlpha = printing && L === built - 1 ? 1 : 0.30 + 0.5 * fy;
    ctx.lineWidth = Math.max(1, w * 0.0045);
    ctx.beginPath();
    for (let a = 0; a <= 32; a++) {
      const ang = (a / 32) * Math.PI * 2 + spin;
      const px = cx + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad * 0.32;
      a ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // handle, once high enough
  if (built > LAYERS * 0.45) {
    ctx.strokeStyle = INK; ctx.globalAlpha = 0.8;
    ctx.beginPath();
    ctx.arc(cx + R * 0.52, cy + R * 0.9 - R * 0.8, R * 0.26, -1.1, 1.1);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  // nozzle rides the top layer while printing
  if (printing) {
    const ny = cy + R * 0.9 - (built / LAYERS) * R * 1.6;
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(cx - R * 0.09, ny - R * 0.42);
    ctx.lineTo(cx + R * 0.09, ny - R * 0.42);
    ctx.lineTo(cx, ny - R * 0.2);
    ctx.closePath(); ctx.fill();
  }

  ctx.fillStyle = INK;
  ctx.globalAlpha = printing ? 0.55 + 0.45 * Math.sin(el * 6) : 0.85;
  ctx.font = `700 ${Math.round(h * 0.055)}px "Barlow Condensed", sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(printing ? `PRINTING ${Math.round((p / 6) * 100)}%` : 'SEND US YOURS',
               cx, h * 0.145);
  ctx.globalAlpha = 1;
}

function faceLabAttract(ctx, w, h, t, world, s) {
  const G = 22;                                   // half-res grid for the cassette
  const cell = Math.min(w, h) / (G + 4);
  const ox = (w - G * cell) / 2, oy = (h - G * cell) / 2 - h * 0.04;
  if (!s.init) {
    s.init = true; s.last = t; s.phase = 0; s.phaseT = 0;
    const eye = (cy, cx, r) => {
      const o = [];
      for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++)
        if (y * y + x * x <= r * r) o.push([cy + y, cx + x]);
      return o;
    };
    const brow = (cy, cx) => [[cy, cx - 2], [cy, cx - 1], [cy, cx], [cy, cx + 1], [cy, cx + 2]];
    const mouthFlat = () => { const o = []; for (let x = -4; x <= 4; x++) o.push([16, 11 + x]); return o; };
    const mouthSmile = () => { const o = []; for (let x = -4; x <= 4; x++) o.push([16 + Math.round(2 - 2 * (x / 4) ** 2), 11 + x]); return o; };
    const heart = (cy, cx) => {
      const shp = ['.X.X.', 'XXXXX', 'XXXXX', '.XXX.', '..X..'];
      const o = [];
      shp.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === 'X') o.push([cy - 2 + y, cx - 2 + x]); }));
      return o;
    };
    s.frames = [
      [...eye(8, 6, 2), ...eye(8, 16, 2), ...brow(4, 6), ...brow(4, 16), ...mouthFlat()],
      [...eye(8, 6, 2), ...eye(8, 16, 2), ...brow(3, 6), ...brow(3, 16), ...mouthSmile()],
      [...heart(8, 6), ...heart(8, 16), ...brow(3, 6), ...brow(3, 16), ...mouthSmile()],
    ];
    s.cursor = { r: 2, c: 2 };
  }
  s.phaseT += Math.min(t - s.last, 50); s.last = t;
  if (s.phaseT > 2200) { s.phaseT = 0; s.phase = (s.phase + 1) % s.frames.length; }

  ctx.fillStyle = '#020a0e'; ctx.fillRect(0, 0, w, h);
  // dim off-grid
  ctx.fillStyle = 'rgba(126,224,255,0.06)';
  for (let r = 0; r < G; r++) for (let c = 0; c < G; c++) {
    ctx.beginPath(); ctx.arc(ox + c * cell + cell / 2, oy + r * cell + cell / 2, cell * 0.12, 0, Math.PI * 2); ctx.fill();
  }
  // lit face (morph: during first 400ms of a phase, dots pop in one by one)
  const dots = s.frames[s.phase];
  const reveal = Math.min(1, s.phaseT / 400);
  ctx.fillStyle = '#e8f6ff';
  const nShow = Math.ceil(dots.length * reveal);
  for (let i = 0; i < nShow; i++) {
    const [r, c] = dots[i];
    ctx.beginPath(); ctx.arc(ox + c * cell + cell / 2, oy + r * cell + cell / 2, cell * 0.34, 0, Math.PI * 2); ctx.fill();
  }
  // roaming edit cursor
  const cur = dots[Math.floor((s.phaseT / 130) % dots.length)];
  if (cur) {
    ctx.strokeStyle = '#7ee0ff'; ctx.lineWidth = 2;
    ctx.strokeRect(ox + cur[1] * cell, oy + cur[0] * cell, cell, cell);
  }
  ctx.font = `bold ${Math.max(9, Math.floor(w * 0.05))}px 'Bungee',sans-serif`;
  ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(126,224,255,0.55)';
  ctx.fillText('FACE LAB', w / 2, h * 0.93);
}

/* ANGRY WORMS attract — catapult flings worm, arc trajectory, terrain impact */
function onairAttract(ctx, w, h, t, world, s) {
  // mini studio: brick wall, JIM & JOE screen, two armoured hosts, ON AIR blink
  ctx.fillStyle = '#5e372a'; ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(40,24,18,0.8)'; ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 8) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    for (let x = (y / 8) % 2 ? 10 : 0; x < w; x += 20) {
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 8); ctx.stroke();
    }
  }
  // floor
  ctx.fillStyle = '#3b2b22'; ctx.fillRect(0, h * 0.78, w, h * 0.22);
  ctx.fillStyle = '#b0475a'; ctx.fillRect(w * 0.2, h * 0.8, w * 0.6, h * 0.1);
  // screen
  const sw = w * 0.44, sx = (w - sw) / 2, sy = h * 0.12, sh = h * 0.22;
  ctx.fillStyle = '#0d0f14'; ctx.fillRect(sx, sy, sw, sh);
  ctx.strokeStyle = '#2a2e38'; ctx.lineWidth = 2; ctx.strokeRect(sx, sy, sw, sh);
  ctx.fillStyle = '#e5d9b8'; ctx.font = 'bold ' + Math.max(7, sw * 0.14) + 'px Georgia, serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('JIM & JOE', sx + sw / 2, sy + sh / 2);
  // ON AIR blink
  const on = Math.sin(t * 0.004) > 0;
  ctx.fillStyle = on ? '#ff3b3b' : '#3a1414';
  ctx.fillRect(w * 0.72, h * 0.06, w * 0.18, h * 0.08);
  ctx.fillStyle = on ? '#fff' : '#7a4040'; ctx.font = 'bold ' + Math.max(5, w * 0.032) + 'px monospace';
  ctx.fillText('ON AIR', w * 0.81, h * 0.1);
  // hosts: Jimmy (white/gold) left walking, Joe (rust) right seated
  function bot(x, y, sc, colA, colTrim, walk) {
    const ph = walk ? Math.sin(t * 0.01) : 0;
    ctx.fillStyle = colA;
    ctx.fillRect(x - 5 * sc + ph * 2, y - 10 * sc, 4 * sc, 10 * sc);
    ctx.fillRect(x + 1 * sc - ph * 2, y - 10 * sc, 4 * sc, 10 * sc);
    ctx.fillRect(x - 7 * sc, y - 24 * sc, 14 * sc, 15 * sc);
    ctx.fillStyle = colTrim;
    ctx.fillRect(x - 9 * sc, y - 25 * sc, 5 * sc, 3 * sc);
    ctx.fillRect(x + 4 * sc, y - 25 * sc, 5 * sc, 3 * sc);
    ctx.fillStyle = colA; ctx.fillRect(x - 6 * sc, y - 36 * sc, 12 * sc, 12 * sc);
    ctx.fillStyle = '#0c0e12'; ctx.fillRect(x - 4.5 * sc, y - 34 * sc, 9 * sc, 8 * sc);
    ctx.fillStyle = '#eef4ff';
    ctx.fillRect(x - 3 * sc, y - 32 * sc, 2 * sc, 1.2 * sc);
    ctx.fillRect(x + 1 * sc, y - 32 * sc, 2 * sc, 1.2 * sc);
    ctx.fillRect(x - 2 * sc, y - 29 * sc, 4 * sc, 1 * sc);
  }
  const fy = h * 0.86, sc = Math.max(1.2, h / 110);
  const jx = w * 0.28 + Math.sin(t * 0.0012) * w * 0.1;
  bot(jx, fy, sc, '#e8e2d4', '#d4a13c', true);
  bot(w * 0.72, fy, sc, '#9a6b3c', '#b0764a', false);
  // speech dots alternating (the banter)
  const talker = Math.floor(t / 1600) % 2;
  const bx = talker ? w * 0.72 : jx, dots = Math.floor(t / 300) % 4;
  ctx.fillStyle = '#fff';
  for (let i = 0; i < dots; i++) {
    ctx.beginPath(); ctx.arc(bx + (i - 1) * 5 * sc, fy - 42 * sc, 1.4 * sc, 0, 7); ctx.fill();
  }
}

function jungleHopAttract(ctx, w, h, t, world, s) {
  if (!s.init) {
    s.init = true; s.last = t;
    s.ang = -0.9; s.vel = 0; s.phase = 0; s.crocPhase = 0;
    s.leaves = Array.from({length: 10}, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.5,
      r: 2 + Math.random() * 3, sp: 0.2 + Math.random() * 0.4 }));
  }
  const dt = Math.min(t - s.last, 32); s.last = t;

  // deep jungle backdrop
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0d1f08'); sky.addColorStop(1, '#1e3d12');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  // canopy
  ctx.fillStyle = '#2a5a18';
  for (let i = 0; i < 6; i++) {
    ctx.beginPath(); ctx.arc(w * (i / 5), h * 0.06, w * 0.14, 0, Math.PI * 2); ctx.fill();
  }
  // drifting leaves
  ctx.fillStyle = 'rgba(121,201,60,0.5)';
  for (const l of s.leaves) {
    l.y += l.sp; l.x += Math.sin(l.y * 0.05) * 0.3;
    if (l.y > h) { l.y = -4; l.x = Math.random() * w; }
    ctx.beginPath(); ctx.ellipse(l.x, l.y, l.r, l.r * 0.5, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // water strip + croc
  const wy = h * 0.82;
  ctx.fillStyle = '#1c4d6e'; ctx.fillRect(0, wy, w, h - wy);
  s.crocPhase += 0.02;
  const jaw = Math.sin(s.crocPhase) > 0.3 ? 5 : 1;
  const cx = w * 0.52, cy = wy - 4;
  ctx.fillStyle = '#3f7a2a';
  ctx.fillRect(cx, cy, w * 0.1, 5);
  ctx.beginPath(); ctx.moveTo(cx + w * 0.1, cy + 1); ctx.lineTo(cx + w * 0.14, cy + 1 - jaw * 0.4); ctx.lineTo(cx + w * 0.14, cy + 2 - jaw * 0.4); ctx.lineTo(cx + w * 0.1, cy + 2.5); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + w * 0.1, cy + 3.5); ctx.lineTo(cx + w * 0.14, cy + 3.5 + jaw); ctx.lineTo(cx + w * 0.14, cy + 4.5 + jaw); ctx.lineTo(cx + w * 0.1, cy + 5); ctx.fill();
  ctx.fillStyle = '#ffdd22'; ctx.fillRect(cx + 2, cy + 1, 2, 2);

  // THE SWING — pendulum monkey
  s.vel += -Math.sin(s.ang) * 0.0022 * dt;
  s.vel *= 0.998;
  s.ang += s.vel * dt * 0.016;
  const ax = w * 0.5, ay = h * 0.1, len = h * 0.55;
  const mx = ax + Math.sin(s.ang) * len, my = ay + Math.cos(s.ang) * len;
  ctx.strokeStyle = '#4a7a1f'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(ax, ay);
  ctx.quadraticCurveTo(ax + Math.sin(s.ang) * len * 0.5, ay + len * 0.55, mx, my);
  ctx.stroke();
  ctx.fillStyle = '#3f9425';
  for (let f = 0.35; f < 1; f += 0.3) {
    ctx.beginPath(); ctx.ellipse(ax + Math.sin(s.ang) * len * f + 2, ay + len * f, 3, 1.5, 0.6, 0, Math.PI * 2); ctx.fill();
  }
  // monkey (arms up on the vine)
  ctx.save(); ctx.translate(mx, my); ctx.rotate(s.ang * 0.5);
  ctx.strokeStyle = '#885522'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(-6, 8, -3, 13); ctx.stroke(); // tail
  ctx.fillStyle = '#cc8833';
  ctx.beginPath(); ctx.arc(0, 6, 5, 0, Math.PI * 2); ctx.fill();      // body
  ctx.beginPath(); ctx.arc(0, -1, 4, 0, Math.PI * 2); ctx.fill();     // head
  ctx.fillStyle = '#ffeecc';
  ctx.beginPath(); ctx.arc(1, -1, 2.2, 0, Math.PI * 2); ctx.fill();   // face
  ctx.fillStyle = '#000'; ctx.fillRect(1.4, -2, 1.2, 1.2);            // eye
  ctx.strokeStyle = '#cc8833'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(-2, 2); ctx.lineTo(-1, -4); ctx.stroke(); // arm to vine
  ctx.restore();

  // bananas arc hint
  ctx.strokeStyle = '#ffe135'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
  for (const bx of [0.2, 0.8]) {
    ctx.beginPath(); ctx.arc(w * bx, h * 0.45, 4, 0.4, Math.PI - 0.4); ctx.stroke();
  }

  ctx.font = `bold ${Math.max(9, Math.floor(w * 0.055))}px 'Bungee',sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(121,201,60,0.55)';
  ctx.fillText('JUNGLE-HOP', w / 2, h * 0.93);
}

function angryWormsAttract(ctx, w, h, t, world, s) {
  if (!s.init) {
    s.init = true; s.last = t; s.phase = 0; s.phaseT = 0;
    // terrain heights — hilly profile
    s.terrain = Array.from({length: 40}, (_, i) => {
      const x = i / 39;
      return h * (0.62 + 0.14 * Math.sin(x * Math.PI * 3.2) + 0.06 * Math.sin(x * Math.PI * 7));
    });
    s.craters = []; s.particles = [];
    s.wormPx = w * 0.08; s.wormPy = 0; // launch pos
    s.arcX = 0; s.arcY = 0; s.arcVx = 0; s.arcVy = 0;
    s.exploded = false;
    s.stars = Array.from({length: 18}, () => ({
      x: Math.random() * w, y: Math.random() * h * 0.55,
      r: Math.random() * 1.2 + 0.3, a: Math.random() * 0.5 + 0.15,
    }));
  }

  const dt = Math.min(t - s.last, 32); s.last = t;
  s.phaseT += dt;

  // helpers
  function terrainY(px) {
    const frac = Math.max(0, Math.min(1, px / w));
    const idx = frac * 39;
    const i = Math.floor(idx), f = idx - i;
    const a = s.terrain[Math.min(i, 39)], b = s.terrain[Math.min(i+1, 39)];
    return a + (b - a) * f;
  }

  // NIGHT RAID look (Osimo 2026-07-29: "that cassette gif is horrendous, follow suit
  // with the others"). The old pass was bright-blue daytime with pastel gradients and
  // soft black radial craters — at cassette size that reads as a washed green blob with
  // dirt smudges, and it clashed with every other cabinet. Pin-Vaders and Flap Fight
  // work because they are DARK with a few high-contrast shapes. Same rule here: near
  // black ground, one neon rim in the cabinet's own ink, everything else silhouette.
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#12040a'); sky.addColorStop(0.55, '#2a0810'); sky.addColorStop(1, '#4a1010');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, h);
  // low moon, dim enough to stay background — silhouette hills read against it
  ctx.fillStyle = 'rgba(255,120,90,0.16)';
  ctx.beginPath(); ctx.arc(w*0.80, h*0.20, Math.min(w,h)*0.16, 0, Math.PI*2); ctx.fill();
  for (const st of s.stars) {
    ctx.fillStyle = 'rgba(255,220,200,' + st.a * 0.7 + ')';
    ctx.beginPath(); ctx.arc(st.x, st.y * 0.8, st.r * 0.9, 0, Math.PI*2); ctx.fill();
  }

  // ground: flat near-black silhouette
  ctx.beginPath(); ctx.moveTo(0, h);
  for (let i = 0; i < s.terrain.length; i++) ctx.lineTo(i / 39 * w, s.terrain[i]);
  ctx.lineTo(w, h); ctx.closePath();
  ctx.fillStyle = '#0b0302'; ctx.fill();
  // neon rim in the cabinet ink — this is the single bright line that gives it shape
  ctx.beginPath(); ctx.moveTo(0, terrainY(0));
  for (let i = 0; i < 40; i++) ctx.lineTo(i/39*w, s.terrain[i]);
  ctx.save();
  ctx.shadowColor = '#e8302a'; ctx.shadowBlur = 10;
  ctx.strokeStyle = '#ff5a4f'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();

  // craters: a BITE out of the neon rim, not a black cloud over the hill
  for (const c of s.craters) {
    ctx.save();
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 0.85, Math.PI, 0);
    ctx.closePath(); ctx.fillStyle = '#0b0302'; ctx.fill();
    ctx.beginPath(); ctx.arc(c.x, c.y, c.r * 0.85, Math.PI, 0);
    ctx.strokeStyle = 'rgba(255,90,79,0.55)'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.restore();
  }

  // catapult (left side)
  const catX = w * 0.10, catTY = terrainY(catX) - 2;
  ctx.strokeStyle = '#8b5e2a'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(catX - w*0.04, catTY); ctx.lineTo(catX, catTY - h*0.11);
  ctx.lineTo(catX + w*0.04, catTY); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(catX - w*0.02, catTY - h*0.03); ctx.lineTo(catX + w*0.02, catTY - h*0.06); ctx.stroke();

  // enemy worm on far hill — flashes then DETONATES after the hit (v4 death mechanic)
  const ewX = w * 0.76, ewY = terrainY(ewX) - 8;
  if (!s.enemyDead) {
    const dyingBlink = s.phase === 2 && (s.phaseT % (s.phaseT > 500 ? 90 : 180)) < (s.phaseT > 500 ? 45 : 90);
    ctx.fillStyle = dyingBlink ? '#ffffff' : '#2ec44e';
    for (let seg = 0; seg < 3; seg++) {
      ctx.beginPath(); ctx.arc(ewX + seg*5, ewY - seg*2, 7-seg, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ewX+3, ewY-2, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ewX+4, ewY-2, 1.2, 0, Math.PI*2); ctx.fill();
  }

  // PHASE 0: worm sitting on catapult (0–800ms)
  if (s.phaseT < 800) {
    s.wormPy = catTY - h*0.14;
    // worm body on cup
    ctx.fillStyle = '#e8302a';
    for (let seg = 0; seg < 3; seg++) {
      ctx.beginPath(); ctx.arc(catX + (seg-1)*5, s.wormPy - seg*1.5, 7-seg*0.5, 0, Math.PI*2); ctx.fill();
    }
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(catX+3, s.wormPy-2, 3, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(catX+4, s.wormPy-2, 1.5, 0, Math.PI*2); ctx.fill();
    // stretch indicator
    const stretch = Math.sin(s.phaseT * 0.008) * 0.5 + 0.5;
    ctx.strokeStyle = `rgba(255,180,60,${0.3+stretch*0.4})`; ctx.lineWidth = 1;
    ctx.setLineDash([3,3]);
    // preview arc
    const vx0 = w*0.0032, vy0 = -h*0.018;
    ctx.beginPath(); ctx.moveTo(catX, s.wormPy);
    for (let i = 0; i < 28; i++) {
      const ti = i * 8;
      ctx.lineTo(catX + vx0*ti, s.wormPy + vy0*ti + 0.00035*ti*ti*h);
    }
    ctx.stroke(); ctx.setLineDash([]);
  }

  // PHASE 0→1 launch
  if (s.phaseT >= 800 && s.phase === 0) {
    s.phase = 1;
    s.arcX = catX; s.arcY = catTY - h*0.14;
    s.arcVx = w * 0.0032; s.arcVy = -h * 0.018;
    s.exploded = false;
  }

  // PHASE 1: worm in flight
  if (s.phase === 1) {
    s.arcVy += 0.00032 * h; // gravity
    s.arcX += s.arcVx; s.arcY += s.arcVy;

    if (!s.exploded) {
      const ty = terrainY(s.arcX);
      if (s.arcY >= ty - 4 && s.arcX > w * 0.3) {
        // impact
        s.exploded = true;
        s.craters.push({x: s.arcX, y: ty - 4, r: w*0.045});
        for (let p = 0; p < 16; p++) {
          const ang = Math.random() * Math.PI * 2, spd = 1.5 + Math.random() * 3;
          s.particles.push({x: s.arcX, y: ty, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 2.5,
            life: 1, r: 3+Math.random()*4, col: Math.random()>0.5 ? '#ff5a1f' : '#ffd23d'});
        }
        s.phase = 2; s.phaseT = 0;
      }
    }

    // Trail. The single biggest readability win at cassette size — a 7px dot crossing a
    // dark field is invisible; a comet is obvious even in a thumbnail.
    s.trail = s.trail || [];
    s.trail.push({x: s.arcX, y: s.arcY});
    if (s.trail.length > 14) s.trail.shift();
    for (let i = 0; i < s.trail.length; i++) {
      const a = (i + 1) / s.trail.length;
      ctx.globalAlpha = a * 0.5;
      ctx.beginPath(); ctx.arc(s.trail[i].x, s.trail[i].y, 5 * a, 0, Math.PI*2);
      ctx.fillStyle = '#ffb03d'; ctx.fill();
    }
    ctx.globalAlpha = 1;

    // draw flying worm (spinning), now with a glow so it separates from the dark sky
    const spin = s.phaseT * 0.008;
    ctx.save(); ctx.translate(s.arcX, s.arcY); ctx.rotate(spin);
    ctx.shadowColor = '#ff5a4f'; ctx.shadowBlur = 12;
    ctx.fillStyle = '#ff4136';
    ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI*2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3, -2, 2.5, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(4, -2, 1.2, 0, Math.PI*2); ctx.fill();
    ctx.restore();
  }

  // particles
  for (let i = s.particles.length - 1; i >= 0; i--) {
    const p = s.particles[i];
    p.x += p.vx; p.y += p.vy; p.vy += 0.18; p.life -= 0.025;
    if (p.life <= 0) { s.particles.splice(i, 1); continue; }
    ctx.globalAlpha = p.life;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
    ctx.fillStyle = p.col; ctx.fill();
    ctx.globalAlpha = 1;
  }

  // PHASE 2: the hit worm flashes ~0.9s then DETONATES, then reset
  if (s.phase === 2 && !s.enemyDead && s.phaseT > 900) {
    s.enemyDead = true;
    s.craters.push({x: ewX, y: ewY + 4, r: w*0.05});
    for (let p2 = 0; p2 < 20; p2++) {
      const ang = Math.random() * Math.PI * 2, spd = 1.8 + Math.random() * 3.2;
      s.particles.push({x: ewX, y: ewY, vx: Math.cos(ang)*spd, vy: Math.sin(ang)*spd - 2.8,
        life: 1, r: 3+Math.random()*5, col: Math.random()>0.4 ? '#ff5a1f' : '#ffd23d'});
    }
  }
  if (s.phase === 2 && s.phaseT > 2100) {
    s.phase = 0; s.phaseT = 0; s.particles = []; s.enemyDead = false; s.trail = [];
    if (s.craters.length > 3) s.craters.shift();
  }

  // label
  ctx.font = `bold ${Math.max(9, Math.floor(w * 0.055))}px 'Bungee',sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(232,48,42,0.5)';
  ctx.fillText('ANGRY WORMS', w/2, h * 0.92);
}

function pinVadersAttract(ctx, w, h, t, world, s) {
  if (!s.init) {
    s.init = true; s.last = t;
    s.stars = Array.from({ length: 24 }, () => ({
      x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.2 + 0.3, tw: Math.random() * 6 }));
    s.gx = w * 0.18; s.dir = 1; s.beat = 0; s.frame = 0;
    s.alive = Array.from({ length: 3 }, () => Array(4).fill(true));
    s.ball = { x: w * 0.5, y: h * 0.5, vx: 0.9, vy: -1.2 };
    s.flipT = 0; s.respawn = 0;
  }
  const dt = Math.min(t - s.last, 32); s.last = t;

  // space backdrop
  ctx.fillStyle = '#0c0514'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#cfe6ff';
  for (const st of s.stars) {
    ctx.globalAlpha = 0.3 + 0.3 * Math.sin(t / 800 + st.tw);
    ctx.fillRect(st.x, st.y, st.r, st.r);
  }
  ctx.globalAlpha = 1;

  // marching mini invaders
  s.beat += dt;
  if (s.beat > 460) {
    s.beat = 0; s.frame ^= 1;
    s.gx += 5 * s.dir;
    if (s.gx < w * 0.08 || s.gx > w * 0.42) s.dir *= -1;
  }
  const cw = w * 0.13, rh = h * 0.11;
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      if (!s.alive[r][c]) continue;
      const ax = s.gx + c * cw, ay = h * 0.12 + r * rh;
      ctx.fillStyle = ['#9fff8a', '#6ee7ff', '#ffffff'][r];
      const u = w * 0.008;
      // tiny crab: body + legs alternate
      ctx.fillRect(ax - 3 * u, ay - u, 6 * u, 2 * u);
      ctx.fillRect(ax - 4 * u, ay, 8 * u, u);
      if (s.frame) { ctx.fillRect(ax - 4 * u, ay + 2 * u, u, u); ctx.fillRect(ax + 3 * u, ay + 2 * u, u, u); }
      else { ctx.fillRect(ax - 2 * u, ay + 2 * u, u, u); ctx.fillRect(ax + u, ay + 2 * u, u, u); }
    }

  // ball physics (toy — bounces around, kills an alien on touch)
  const b = s.ball;
  b.vy += 0.05; b.x += b.vx * dt * 0.06; b.y += b.vy * dt * 0.06;
  if (b.x < w * 0.05 || b.x > w * 0.95) b.vx *= -1;
  if (b.y < h * 0.05) b.vy = Math.abs(b.vy);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 4; c++) {
      if (!s.alive[r][c]) continue;
      const ax = s.gx + c * cw, ay = h * 0.12 + r * rh;
      if (Math.abs(b.x - ax) < w * 0.04 && Math.abs(b.y - ay) < h * 0.045) {
        s.alive[r][c] = false; b.vy = 1.4; b.vx = (Math.random() - 0.5) * 2.4;
        if (s.alive.every(row => row.every(a => !a)))
          s.alive = Array.from({ length: 3 }, () => Array(4).fill(true));
      }
    }
  // flippers flick the ball back up
  const fy = h * 0.86;
  s.flipT = Math.max(0, s.flipT - dt);
  if (b.y > fy - h * 0.03 && b.vy > 0) { b.vy = -(1.3 + Math.random() * 0.7); s.flipT = 140; }
  if (b.y > h) { b.x = w * 0.5; b.y = h * 0.4; b.vy = -1; }

  // draw flippers (flick = raised angle)
  const lift = s.flipT > 0 ? -0.45 : 0.35;
  ctx.strokeStyle = '#b76bff'; ctx.lineWidth = 4; ctx.lineCap = 'round';
  ctx.shadowColor = '#b76bff'; ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(w * 0.3, fy); ctx.lineTo(w * 0.3 + Math.cos(lift) * w * 0.14, fy + Math.sin(lift) * w * 0.14);
  ctx.moveTo(w * 0.7, fy); ctx.lineTo(w * 0.7 - Math.cos(lift) * w * 0.14, fy + Math.sin(lift) * w * 0.14);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // ball
  ctx.fillStyle = '#f4f7ff'; ctx.shadowColor = '#fff'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.arc(b.x, b.y, w * 0.018, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;

  ctx.textAlign = 'center';
  ctx.font = 'bold ' + Math.round(w * 0.05) + 'px "Courier New", monospace';
  ctx.fillStyle = 'rgba(183,107,255,0.55)';
  ctx.fillText('PIN-VADERS', w / 2, h * 0.97);
}

document.addEventListener('DOMContentLoaded', init);

/* ── Chrome Flipper attract — neon ball + mini pinball table ── */
function chromeFlipperAttract(ctx, w, h, t, world, s) {
  if (!s.bx) { s.bx = w*0.5; s.by = h*0.35; s.vx = 1.4; s.vy = 0.8; }
  ctx.fillStyle = '#000a0c'; ctx.fillRect(0, 0, w, h);
  // table outline
  ctx.save();
  ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 1.5;
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 8;
  const mx = w*0.12, mw = w*0.76, my = h*0.05, mh = h*0.88;
  ctx.strokeRect(mx, my, mw, mh);
  ctx.shadowBlur = 0;
  // bumpers
  [[w*0.35,h*0.28],[w*0.5,h*0.22],[w*0.65,h*0.28]].forEach(([bx,by]) => {
    ctx.fillStyle = '#00e5ff'; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(bx, by, w*0.045, 0, Math.PI*2); ctx.fill();
  });
  ctx.shadowBlur = 0;
  // physics
  s.bx += s.vx; s.by += s.vy; s.vy += 0.09;
  s.vx = Math.max(-3, Math.min(3, s.vx));
  s.vy = Math.max(-4, Math.min(4, s.vy));
  if (s.bx < mx+6 || s.bx > mx+mw-6) { s.vx *= -0.9; s.bx = Math.max(mx+6, Math.min(mx+mw-6, s.bx)); }
  if (s.by < my+6) { s.vy *= -0.9; s.by = my+6; }
  // flipper catch
  if (s.by > h*0.82 && s.bx > w*0.2 && s.bx < w*0.8) { s.vy = -3.5-Math.random()*1.5; s.vx += (Math.random()-0.5)*1.5; }
  if (s.by > h*0.92) { s.by = h*0.35; s.bx = w*0.4+Math.random()*w*0.2; s.vy = 1; s.vx = (Math.random()-0.5)*3; }
  // ball with glow
  ctx.fillStyle = '#00e5ff'; ctx.shadowBlur = 10; ctx.shadowColor = '#00e5ff';
  ctx.beginPath(); ctx.arc(s.bx, s.by, 5, 0, Math.PI*2); ctx.fill();
  ctx.shadowBlur = 0;
  // flippers
  ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2.5; ctx.shadowBlur = 5;
  ctx.beginPath(); ctx.moveTo(w*0.18, h*0.86); ctx.lineTo(w*0.44, h*0.83); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(w*0.82, h*0.86); ctx.lineTo(w*0.56, h*0.83); ctx.stroke();
  ctx.restore();
}


