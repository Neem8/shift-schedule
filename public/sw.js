// public/sw.js
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  // Let browser network request pass through transparently
  event.respondWith(fetch(event.request));
});