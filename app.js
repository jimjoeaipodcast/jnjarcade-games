/* JnJ Arcade — app.js
   Builds the cartridge grid from games.json, handles unlock logic & interactions */

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);


function isUnlocked(releaseDateStr) {
  const d = new Date(releaseDateStr + 'T00:00:00');
  return d <= TODAY;
}

function formatReleaseDate(releaseDateStr) {
  const d = new Date(releaseDateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatShortDate(releaseDateStr) {
  const d = new Date(releaseDateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }).toUpperCase();
}

function daysUntil(releaseDateStr) {
  const d = new Date(releaseDateStr + 'T00:00:00');
  const diff = d - TODAY;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function wasJustUnlocked(releaseDateStr) {
  const d = new Date(releaseDateStr + 'T00:00:00');
  const daysSince = Math.floor((TODAY - d) / (1000 * 60 * 60 * 24));
  return daysSince <= 1;
}


/* ── Social pixel buttons ─────────────────────────────────── */

const SOCIAL_COLORS = {
  Shop:    '#ffe600',
  YouTube: '#ff4040',
  Patreon: '#ff2bd6',
  KoFi:    '#00f0ff',
};

function buildSocialBtn(app) {
  const a = document.createElement('a');
  a.className = 'social-btn';
  a.href = app.url;
  a.target = '_blank';
  a.rel = 'noopener';
  a.style.setProperty('--c', SOCIAL_COLORS[app.label] || '#00f0ff');
  a.textContent = app.name.toUpperCase();
  return a;
}


/* ── Game cartridges ──────────────────────────────────────── */

function buildGameCard(game) {
  const unlocked = isUnlocked(game.releaseDate);

  const wrap = document.createElement('div');
  wrap.className = `cart-wrap ${unlocked ? 'unlocked' : 'locked'}`;

  const cart = document.createElement('article');
  cart.className = 'cart';

  // Inline --c would beat the locked-state CSS override, so only set it when unlocked
  if (unlocked) {
    const c = game.gradient && game.gradient[0] ? game.gradient[0] : '#00f0ff';
    wrap.style.setProperty('--c', c);
    cart.style.setProperty('--c', c);
  }

  // Top strip: week + episode
  const top = document.createElement('div');
  top.className = 'cart-top';
  top.innerHTML = `<span>WK ${String(game.week).padStart(2, '0')}</span><span class="ep">${game.episode.toUpperCase()}</span>`;
  cart.appendChild(top);

  // Screen: artwork / emoji / padlock
  const screen = document.createElement('div');
  screen.className = 'cart-screen';
  if (unlocked && game.icon) {
    const img = document.createElement('img');
    img.src = game.icon;
    img.alt = game.name;
    img.loading = 'lazy';
    screen.appendChild(img);
  } else if (unlocked) {
    const em = document.createElement('span');
    em.className = 'cart-emoji';
    em.textContent = game.emoji || '\u{1F579}️';
    screen.appendChild(em);
  } else {
    const lock = document.createElement('span');
    lock.className = 'cart-lock';
    lock.textContent = '\u{1F512}';
    screen.appendChild(lock);
  }
  cart.appendChild(screen);

  // Name
  const name = document.createElement('h3');
  name.className = 'cart-name';
  name.textContent = game.name.toUpperCase();
  cart.appendChild(name);

  // Status line
  const status = document.createElement('div');
  status.className = 'cart-status';
  if (unlocked) {
    status.innerHTML = '&#9658; PLAY';
  } else {
    status.textContent = 'LOCKED';
    const date = document.createElement('div');
    date.className = 'cart-date';
    const days = daysUntil(game.releaseDate);
    date.textContent = days === 1 ? 'UNLOCKS TOMORROW' : `UNLOCKS ${formatShortDate(game.releaseDate)}`;
    cart.appendChild(status);
    cart.appendChild(date);
  }
  if (unlocked) cart.appendChild(status);

  // NEW! badge
  if (unlocked && wasJustUnlocked(game.releaseDate)) {
    const badge = document.createElement('div');
    badge.className = 'new-badge';
    badge.textContent = 'NEW!';
    cart.appendChild(badge);
  }

  // Deny sweep overlay (locked click feedback)
  const sweep = document.createElement('div');
  sweep.className = 'deny-sweep';
  cart.appendChild(sweep);

  wrap.appendChild(cart);

  // Interactions
  if (unlocked) {
    wrap.addEventListener('click', () => {
      incrementPlayCount(game.id);
      navigate(game.url);
    });
  } else {
    wrap.addEventListener('click', () => denied(wrap));
  }

  return wrap;
}

// Scanline flash + shake on locked cartridge
function denied(wrap) {
  if (wrap.classList.contains('denied')) return;
  wrap.classList.add('denied');
  setTimeout(() => wrap.classList.remove('denied'), 550);
}


function navigate(url) {
  document.body.style.transition = 'opacity 0.2s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = url;
  }, 200);
}


/* ── Play counts (localStorage) ───────────────────────────── */

function getPlayCount(gameId) {
  return parseInt(localStorage.getItem(`jnj_plays_${gameId}`) || '0', 10);
}

function incrementPlayCount(gameId) {
  localStorage.setItem(`jnj_plays_${gameId}`, getPlayCount(gameId) + 1);
}


/* ── Marquee ticker ───────────────────────────────────────── */

function buildTicker(data) {
  const track = document.getElementById('tickerTrack');
  if (!track) return;

  const SEP = '<span class="tk-sep">&#9733;</span>';
  const parts = [];

  data.games
    .filter(g => isUnlocked(g.releaseDate))
    .forEach(g => parts.push(`<span class="tk-live">${g.name.toUpperCase()} &#8212; NOW PLAYING</span>`));

  parts.push('<span>INSERT COIN</span>');

  data.games
    .filter(g => !isUnlocked(g.releaseDate))
    .sort((a, b) => a.week - b.week)
    .slice(0, 6)
    .forEach(g => parts.push(`<span class="tk-soon">COMING ${formatShortDate(g.releaseDate)}: ${g.name.toUpperCase()}</span>`));

  parts.push('<span>NEW GAME EVERY EPISODE</span>');

  const seq = SEP + parts.join(SEP) + SEP;
  // Duplicate sequence for a seamless -50% translateX loop
  track.innerHTML = seq + seq;
}


/* ── Grid build ───────────────────────────────────────────── */

function buildGrid(data) {
  // Social pixel buttons
  const socialRow = document.getElementById('socialRow');
  data.social.forEach(app => socialRow.appendChild(buildSocialBtn(app)));

  // Sort by play count desc, then by week order as tiebreaker
  const sorted = [...data.games].sort((a, b) => {
    const diff = getPlayCount(b.id) - getPlayCount(a.id);
    return diff !== 0 ? diff : a.week - b.week;
  });

  const grid = document.getElementById('appGrid');
  sorted.forEach(game => grid.appendChild(buildGameCard(game)));
}


async function init() {
  try {
    const resp = await fetch('games.json?v=' + Date.now());
    const data = await resp.json();
    buildGrid(data);
    buildTicker(data);

    // Fade in
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
      document.body.style.transition = 'opacity 0.3s ease';
      document.body.style.opacity = '1';
    });
  } catch (err) {
    console.error('Failed to load games.json:', err);
    document.getElementById('appGrid').innerHTML =
      '<p class="load-error">GAME OVER<br>FAILED TO LOAD ARCADE DATA<br>PRESS F5 TO CONTINUE</p>';
  }
}

// Request fullscreen on first touch to hide browser chrome on mobile
(function() {
  function goFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
    if (req) req.call(el);
    document.removeEventListener('touchstart', goFullscreen);
    document.removeEventListener('click', goFullscreen);
  }
  document.addEventListener('touchstart', goFullscreen, { once: true, passive: true });
  document.addEventListener('click', goFullscreen, { once: true });
})();

document.addEventListener('DOMContentLoaded', init);
