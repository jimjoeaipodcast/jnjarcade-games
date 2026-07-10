/* JnJ Arcade — minimal service worker for PWA installability */
const CACHE = 'jnj-v2';
const PRECACHE = [
  '/assets/icons/jnj-logo-192.png',
  '/assets/icons/jnj-logo-512.png',
  '/manifest.json'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  /* Never cache HTML — always network-first so updates land immediately */
  if (e.request.destination === 'document' || e.request.url.endsWith('/')) return;
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});
