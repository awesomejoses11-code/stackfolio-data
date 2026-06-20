// Service Worker for StackFolio PWA
const CACHE_NAME = 'stackfolio-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/preview.html',
  '/clipboard assistant.html',
  '/qr-code-generator.html',
  '/Neon_Fury.html'
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Caching app shell');
      return cache.addAll(urlsToCache).catch((error) => {
        console.warn('[SW] Cache addAll error:', error);
        // Continue even if some files fail to cache
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((cacheName) => cacheName !== CACHE_NAME)
          .map((cacheName) => {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then((response) => {
      // Return cached version if available
      if (response) {
        console.log('[SW] Served from cache:', request.url);
        return response;
      }

      // Fetch from network WITH redirect following
      return fetch(request, { redirect: 'follow' }).then((networkResponse) => {
        // Only cache successful, non-redirect responses
        if (networkResponse && networkResponse.status === 200 && !networkResponse.redirected) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch((error) => {
        console.log('[SW] Fetch failed, offline:', request.url, error);
        // Return cached index.html as fallback
        return caches.match('/index.html');
      });
    })
  );
});
