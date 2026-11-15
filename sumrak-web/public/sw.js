const CACHE = 'sumrak-offline-v1';
const OFFLINE_URL = '/offline.html';
const ASSETS = [OFFLINE_URL, '/icon.svg', '/icon-192.png', '/icon-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(key => key.startsWith('sumrak-offline-') && key !== CACHE).map(key => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  if (request.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  if (url.pathname === '/owner' || url.pathname.startsWith('/owner/') || url.pathname.startsWith('/o/')) return;
  if (request.mode !== 'navigate') return;

  event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
});
