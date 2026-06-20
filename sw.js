// Service Worker for StackFolio PWA
const CACHE_NAME = 'stackfolio-v4';
const urlsToCache = [
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
  // Remove HTML files - we'll handle them separately
];

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching assets');
      return Promise.all(
        urlsToCache.map((url) => {
          return fetch(url, { redirect: 'follow' })
            .then((response) => {
              if (response && response.status === 200) {
                return cache.put(url, response);
              }
            })
            .catch((error) => {
              console.warn(`[SW] Failed to cache ${url}:`, error);
            });
        })
      );
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
  const url = new URL(request.url);

  // Skip non-GET requests and chrome extensions
  if (request.method !== 'GET' || url.protocol === 'chrome-extension:') {
    return;
  }

  // Network-first for HTML files (handles cleanUrls redirects)
  if (url.pathname.endsWith('.html') || url.pathname === '/') {
    event.respondWith(
      fetch(request, { redirect: 'follow' })
        .then((response) => {
          if (response && response.status === 200) {
            // Cache successful HTML pages
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request.url, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          console.log('[SW] Network failed, serving from cache:', request.url);
          // Fall back to cache if offline
          return caches.match(request.url).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Served from cache:', request.url);
              return cachedResponse;
            }
            // Final fallback to index.html
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Cache-first for assets (images, fonts, css, js)
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        console.log('[SW] Served from cache:', request.url);
        return response;
      }

      return fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch((error) => {
          console.log('[SW] Asset fetch failed:', request.url);
          return new Response('Asset unavailable', { status: 404 });
        });
    })
  );
});
