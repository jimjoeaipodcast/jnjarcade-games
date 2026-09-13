/* Upcoming-channel likes + live ranking — shared by /cinema and /patreon-cinema.
   Osimo 2026-09-13: "add a like thumb to the upcoming channels (hide their counter),
   but arrange order from most liked to least liked after the zodiac. Leave the patron
   only channel at the bottom regardless of likes, don't add likes to our current
   channel nor to the zodiac."

   Contract with the HTML — every cassette carries:
     data-channel="<id>"     matches the API allowlist in functions/api/channel-likes.js
     data-rank="top"         never moves, never likeable (live channel, then the zodiac)
     data-rank="vote"        ranked by likes, descending
     data-rank="bottom"      pinned last no matter how many likes it has (Patreon only)

   Site Hard Rule 1 — never rank from file order; rank from live data at render time.
   The DOM order in the HTML is only the fallback when /api/channel-likes is
   unreachable, and it is a sane order on its own.

   Site Hard Rule 6 — never hard-fail on a missing optional element. Every lookup here
   null-guards and returns; a cinema page with no cassettes must still render. */

(function () {
  'use strict';

  var API = '/api/channel-likes';
  var STORE = 'jnj-liked-channels';

  /* ---- per-device memory of what this visitor already liked ---------------- */

  function readLiked() {
    try {
      var raw = localStorage.getItem(STORE);
      var parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      return [];   // private mode / storage disabled — likes just won't persist
    }
  }

  function writeLiked(ids) {
    try {
      localStorage.setItem(STORE, JSON.stringify(ids));
    } catch (e) { /* non-fatal: the thumb still shows its state for this pageview */ }
  }

  function hasLiked(id) {
    return readLiked().indexOf(id) !== -1;
  }

  function setLiked(id, on) {
    var ids = readLiked();
    var at = ids.indexOf(id);
    if (on && at === -1) ids.push(id);
    if (!on && at !== -1) ids.splice(at, 1);
    writeLiked(ids);
  }

  /* ---- ranking ------------------------------------------------------------ */

  function rankCassettes(counts) {
    var row = document.querySelector('.cass-row');
    if (!row) return;

    var cards = Array.prototype.slice.call(row.querySelectorAll('.cass'));
    if (!cards.length) return;

    // Remember the authored order so ties never shuffle between loads.
    cards.forEach(function (card, i) { card._authored = i; });

    var tops = cards.filter(function (c) { return c.dataset.rank === 'top'; });
    var votes = cards.filter(function (c) { return c.dataset.rank === 'vote'; });
    var bottoms = cards.filter(function (c) { return c.dataset.rank === 'bottom'; });

    // Anything without a data-rank keeps its place among the voted block rather than
    // vanishing — a cassette added later without the attribute must still show up.
    var tagged = tops.length + votes.length + bottoms.length;
    if (tagged !== cards.length) {
      votes = votes.concat(cards.filter(function (c) { return !c.dataset.rank; }));
    }

    votes.sort(function (a, b) {
      var la = counts[a.dataset.channel] || 0;
      var lb = counts[b.dataset.channel] || 0;
      if (lb !== la) return lb - la;              // most liked first
      return a._authored - b._authored;           // stable tie-break
    });

    // Re-append in final order. appendChild moves an existing node, so this is a
    // reorder, not a re-render: no flicker, listeners and images stay attached.
    tops.concat(votes, bottoms).forEach(function (card) { row.appendChild(card); });
  }

  /* ---- the thumb ---------------------------------------------------------- */

  function paint(btn, liked) {
    btn.setAttribute('aria-pressed', liked ? 'true' : 'false');
    var label = btn.querySelector('.like-label');
    if (label) label.textContent = liked ? 'LIKED' : 'LIKE';
    // No count anywhere in here, by design.
    btn.setAttribute('aria-label',
      (liked ? 'Liked ' : 'Like ') + (btn.dataset.channelName || 'this channel'));
  }

  function send(id, op) {
    return fetch(API, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: id, op: op }),
    }).then(function (r) {
      if (!r.ok) throw new Error('like failed: ' + r.status);
      return r.json();
    });
  }

  function wire(btn) {
    var id = btn.dataset.channel;
    if (!id) return;

    paint(btn, hasLiked(id));

    btn.addEventListener('click', function () {
      var liked = btn.getAttribute('aria-pressed') === 'true';
      var op = liked ? 'unlike' : 'like';

      // Optimistic paint, then revert if the write actually fails — the button is the
      // only feedback there is, so it must not sit dead while the request flies.
      paint(btn, !liked);
      btn.dataset.busy = '1';

      send(id, op).then(function () {
        setLiked(id, !liked);
      }).catch(function () {
        paint(btn, liked);          // put it back; nothing was recorded
      }).then(function () {
        delete btn.dataset.busy;
      });
    });
  }

  /* ---- boot --------------------------------------------------------------- */

  function init() {
    var buttons = document.querySelectorAll('.cass-like');
    Array.prototype.forEach.call(buttons, wire);

    fetch(API, { headers: { 'cache-control': 'no-cache' } })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (counts) {
        rankCassettes(counts && typeof counts === 'object' ? counts : {});
      })
      .catch(function () {
        /* API down → leave the authored DOM order exactly as it is. */
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();   // script is at the end of <body>, so this is the usual path
  }
})();
