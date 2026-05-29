/* JnJ Arcade — app.js
   Builds the icon grid from games.json, handles unlock logic & interactions */

const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);

// ── Helpers ────────────────────────────────────────────────────────────────

function isUnlocked(releaseDateStr) {
  const d = new Date(releaseDateStr + 'T00:00:00');
  return d <= TODAY;
}

function formatReleaseDate(releaseDateStr) {
  const d = new Date(releaseDateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
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

// ── Toast notification ────────────────────────────────────────────────────

let toastTimer = null;
const toast = document.getElementById('toast');
const toastTitle = document.getElementById('toastTitle');
const toastSub = document.getElementById('toastSub');

function showToast(title, sub) {
  toastTitle.textContent = title;
  toastSub.textContent = sub;
  toast.classList.add('visible');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3000);
}

// ── Real brand SVG logos ──────────────────────────────────────────────────

const SOCIAL_LOGOS = {
  YouTube: {
    gradient: ['#FF0000','#CC0000'],
    svg: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>`,
  },
  TikTok: {
    gradient: ['#010101','#1a1a2e'],
    svg: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M19.6 3a5.4 5.4 0 0 1-3.2-1.8A5.4 5.4 0 0 1 15 0h-3.8v16.3a2.6 2.6 0 0 1-2.6 2.2 2.6 2.6 0 0 1-2.6-2.6 2.6 2.6 0 0 1 2.6-2.6c.3 0 .5 0 .8.1V9.5a6.4 6.4 0 0 0-.8 0A6.4 6.4 0 0 0 2 15.9 6.4 6.4 0 0 0 8.6 22.3a6.4 6.4 0 0 0 6.4-6.4V8.1a9 9 0 0 0 5.3 1.7V6a5.4 5.4 0 0 1-.7 0 5.4 5.4 0 0 1-3.3-1v-2h3.3z"/></svg>`,
  },
  Patreon: {
    gradient: ['#FF424D','#CC2030'],
    svg: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M14.82 2.41c3.96 0 6.77 2.78 6.77 6.74 0 3.96-2.81 6.73-6.77 6.73-3.97 0-6.77-2.77-6.77-6.73 0-3.96 2.8-6.74 6.77-6.74zM2.18 21.58V2.41h3.68v19.17H2.18z"/></svg>`,
  },
  KoFi: {
    gradient: ['#FF5E5B','#E03030'],
    svg: `<svg viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg"><path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.246 1.453-4.011 3.976-4.011 3.976s-.121.119-.31.023c-.076-.057-.108-.09-.108-.09-.443-.441-3.368-3.049-4.034-3.954-.709-.965-1.041-2.7-.091-3.71.951-1.01 3.005-1.086 4.363.407 0 0 1.565-1.782 3.468-.963 1.904.82 1.832 3.011.723 4.311zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/></svg>`,
  },
  Shop: {
    gradient: ['#FF9F0A','#E07000'],
    svg: `<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
  },
};

// ── Icon builders ─────────────────────────────────────────────────────────

// Convert a hex color to an rgba glow string
function hexToGlow(hex, alpha = 0.55) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0,2),16);
  const g = parseInt(h.slice(2,4),16);
  const b = parseInt(h.slice(4,6),16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function buildIconFace(emoji, gradient, extra = '', imgSrc = null) {
  const face = document.createElement('div');
  face.className = 'icon-face';
  face.style.background = `linear-gradient(145deg, ${gradient[0]}, ${gradient[1]})`;
  // Inject per-icon color glow for hover effect
  if (gradient[0] && gradient[0].startsWith('#')) {
    face.style.setProperty('--glow', hexToGlow(gradient[0]));
  }

  if (imgSrc) {
    const img = document.createElement('img');
    img.src = imgSrc;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;position:absolute;top:0;left:0;border-radius:inherit;';
    face.style.overflow = 'hidden';
    face.appendChild(img);
  } else {
    const emojiEl = document.createElement('span');
    emojiEl.style.cssText = 'position:relative;z-index:1;line-height:1;display:block;';
    emojiEl.textContent = emoji;
    face.appendChild(emojiEl);
  }

  if (extra) face.insertAdjacentHTML('beforeend', extra);
  return face;
}

function buildSocialIcon(app) {
  const wrap = document.createElement('div');
  wrap.className = 'icon-wrap unlocked social-icon';
  wrap.addEventListener('click', () => window.open(app.url, '_blank', 'noopener'));

  const logo = SOCIAL_LOGOS[app.label];
  const grad = logo ? logo.gradient : app.gradient;
  const face = document.createElement('div');
  face.className = 'icon-face';
  face.style.background = `linear-gradient(145deg, ${grad[0]}, ${grad[1]})`;
  if (grad[0] && grad[0].startsWith('#')) {
    face.style.setProperty('--glow', hexToGlow(grad[0]));
  }

  if (logo) {
    const svgWrap = document.createElement('div');
    svgWrap.className = 'logo-svg';
    svgWrap.innerHTML = logo.svg;
    face.appendChild(svgWrap);
  } else {
    const em = document.createElement('span');
    em.style.cssText = 'position:relative;z-index:1;line-height:1;display:block;';
    em.textContent = app.emoji;
    face.appendChild(em);
  }
  wrap.appendChild(face);
  return wrap;
}

function buildGameIcon(game) {
  const unlocked = isUnlocked(game.releaseDate);
  const wrap = document.createElement('div');
  wrap.className = `icon-wrap ${unlocked ? 'unlocked' : 'locked'}`;

  if (unlocked) {
    if (wasJustUnlocked(game.releaseDate)) {
      wrap.classList.add('just-unlocked');
    }
    wrap.addEventListener('click', () => {
      incrementPlayCount(game.id);
      navigate(game.url);
    });
  } else {
    wrap.addEventListener('click', () => {
      const days = daysUntil(game.releaseDate);
      const dateStr = formatReleaseDate(game.releaseDate);
      showToast(
        `${game.name} is locked`,
        `Unlocks ${days === 1 ? 'tomorrow' : `on ${dateStr}`} — Week ${game.week}`
      );
    });
  }

  // Build icon face
  let extraHtml = '';
  if (!unlocked) {
    extraHtml = `
      <div class="lock-overlay">🔒</div>
      <div class="week-badge">Wk ${game.week}</div>
    `;
  } else if (wasJustUnlocked(game.releaseDate)) {
    extraHtml = `<div class="new-badge">NEW</div>`;
  }

  const face = buildIconFace(
    unlocked ? game.emoji : '·',
    unlocked ? game.gradient : ['#2c2c2e', '#1c1c1e'],
    '',
    unlocked && game.icon ? game.icon : null
  );
  if (extraHtml) face.insertAdjacentHTML('beforeend', extraHtml);
  wrap.appendChild(face);

  return wrap;
}

// ── Navigate with iOS-style fade ────────────────────────────────────────

function navigate(url) {
  document.body.style.transition = 'opacity 0.2s ease';
  document.body.style.opacity = '0';
  setTimeout(() => {
    window.location.href = url;
  }, 200);
}

// ── Play count (localStorage) ─────────────────────────────────────────────

function getPlayCount(gameId) {
  return parseInt(localStorage.getItem(`jnj_plays_${gameId}`) || '0', 10);
}

function incrementPlayCount(gameId) {
  localStorage.setItem(`jnj_plays_${gameId}`, getPlayCount(gameId) + 1);
}

// ── Build grid ────────────────────────────────────────────────────────────

function buildGrid(data) {
  const grid = document.getElementById('appGrid');

  // Social row (no label, no divider)
  const socialRow = document.createElement('div');
  socialRow.className = 'icon-row';
  data.social.forEach(app => socialRow.appendChild(buildSocialIcon(app)));
  grid.appendChild(socialRow);

  // Sort by play count desc, then by week order as tiebreaker
  const sorted = [...data.games].sort((a, b) => {
    const diff = getPlayCount(b.id) - getPlayCount(a.id);
    return diff !== 0 ? diff : a.week - b.week;
  });

  // Game rows (4 per row)
  const perRow = 4;
  for (let i = 0; i < sorted.length; i += perRow) {
    const row = document.createElement('div');
    row.className = 'icon-row';
    sorted.slice(i, i + perRow).forEach(game => row.appendChild(buildGameIcon(game)));
    grid.appendChild(row);
  }
}

// ── Clock update ─────────────────────────────────────────────────────────
// The status bar shows the real time on mobile for authenticity

function startClock() {
  const el = document.getElementById('statusTime');
  if (!el) return;

  function update() {
    const now = new Date();
    const h = now.getHours().toString().padStart(2, '0');
    const m = now.getMinutes().toString().padStart(2, '0');
    el.textContent = `${h}:${m}`;
  }

  update();
  setInterval(update, 60000);
}

// ── Init ─────────────────────────────────────────────────────────────────

async function init() {
  try {
    const resp = await fetch('games.json?v=' + Date.now());
    const data = await resp.json();
    buildGrid(data);
    startClock();

    // Fade in
    document.body.style.opacity = '0';
    requestAnimationFrame(() => {
      document.body.style.transition = 'opacity 0.3s ease';
      document.body.style.opacity = '1';
    });
  } catch (err) {
    console.error('Failed to load games.json:', err);
    document.getElementById('appGrid').innerHTML =
      '<p style="color:rgba(255,255,255,0.5);padding:20px;font-size:13px;font-family:system-ui">Failed to load arcade data.</p>';
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
