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
