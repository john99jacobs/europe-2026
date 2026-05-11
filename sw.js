const CACHE = 'europe-2026-v3';
const ASSETS = [
  '/europe-2026/',
  '/europe-2026/index.html',
  '/europe-2026/css/style.css',
  '/europe-2026/js/app.js',
  '/europe-2026/js/weather.js',
  '/europe-2026/js/flights.js',
  '/europe-2026/trip.json',
  '/europe-2026/icons/icon-192.png',
  '/europe-2026/icons/icon-512.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Weather API: network-only, fail silently
  if (url.hostname === 'api.open-meteo.com') {
    event.respondWith(fetch(event.request).catch(() => new Response('', { status: 503 })));
    return;
  }

  // trip.json: network-first so updates reach users immediately; cache is offline fallback
  if (url.pathname.endsWith('trip.json')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // App shell: cache-first
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
