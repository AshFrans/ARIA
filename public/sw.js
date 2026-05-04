const CACHE = 'aria-shell-v1';

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.add('/')));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Pass through external API calls (Groq, Clockify, GitHub, etc.)
  if (url.origin !== location.origin) return;

  if (request.mode === 'navigate') {
    // Navigation: network-first, fall back to cached shell
    e.respondWith(
      fetch(request)
        .then((r) => {
          caches.open(CACHE).then((c) => c.put(request, r.clone()));
          return r;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Static assets: cache-first
  e.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((r) => {
        if (r.ok) caches.open(CACHE).then((c) => c.put(request, r.clone()));
        return r;
      });
    })
  );
});
