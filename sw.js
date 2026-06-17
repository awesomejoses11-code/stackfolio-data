// Service Worker for StackFolio PWA
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Basic fetch handler
  event.respondWith(
    fetch(event.request).catch(() => {
      // Optionally, serve offline content
    })
  );
});