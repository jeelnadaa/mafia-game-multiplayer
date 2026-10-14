// Minimal PWA Service Worker for Mafia: Shadows of the City
// Caches static app shell assets with stale-while-revalidate
// CRITICAL: Strictly NEVER caches TURN credentials, signaling, or API routes

const CACHE_NAME = 'mafia-cache-v1';
const STATIC_ASSETS = [
  '/',
  '/assets/og.png',
  '/assets/logo-mark.png',
  '/icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // NEVER cache TURN credentials, API routes, WebSockets, or third-party signaling
  if (
    event.request.method !== 'GET' ||
    url.pathname.startsWith('/api/turn-credentials') ||
    url.pathname.startsWith('/api/') ||
    url.protocol.startsWith('ws') ||
    url.hostname.includes('peerjs') ||
    url.hostname.includes('metered.ca')
  ) {
    return;
  }

  // Stale-while-revalidate for static files, network-first with cache fallback for pages
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
