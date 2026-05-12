const CACHE = 'creative-spxce-v1';

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(['/'])));
});

self.addEventListener('activate', e => {
  e.waitUntil(clients.claim());
});

// Network-first: always try live content, fall back to cache
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
