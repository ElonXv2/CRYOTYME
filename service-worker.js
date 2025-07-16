
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('bank-app-v1').then(cache => {
      return cache.addAll([
        './',
        './index.html',
        './style.css',
        './script.js',
        './indexeddb.js',
        './logo.png',
        './promo.jpg',
        './background.jpg'
      ]);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});
