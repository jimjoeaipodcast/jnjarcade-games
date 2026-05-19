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

// ── Icon builders ─────────────────────────────────────────────────────────

function buildIconFace(emoji, gradient, extra = '') {
  const face = document.createElement('div');
  face.className = 'icon-face';
  face.style.background = `linear-gradient(145deg, ${gradient[0]}, ${gradient[1]})`;

  const emojiEl = document.createElement('span');
  emojiEl.style.cssText = 'position:relative;z-index:1;line-height:1;display:block;';
  emojiEl.textContent = emoji;
  face.appendChild(emojiEl);

  if (extra) {
    face.insertAdjacentHTML('beforeend', extra);
  }
  return face;
}

function buildSocialIcon(app) {
  const wrap = document.createElement('div');
  wrap.className = 'icon-wrap unlocked social-icon';
  wrap.addEventListener('click', () => {
    window.open(app.url, '_blank', 'noopener');
  });
  wrap.appendChild(buildIconFace(app.emoji, app.gradient));
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
    unlocked ? game.gradient : ['#2c2c2e', '#1c1c1e']
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
    const resp = await fetch('games.json');
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

document.addEventListener('DOMContentLoaded', init);
