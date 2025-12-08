/* eslint-disable no-restricted-globals */

// Service Worker for MediaCore PWA
const CACHE_NAME = 'mediacore-v1';
const RUNTIME_CACHE = 'mediacore-runtime';

// Resources to cache immediately on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline page');
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        console.log('[ServiceWorker] Pre-cache failed:', err);
      });
    })
  );
  // Force waiting service worker to become active
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  const currentCaches = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return cacheNames.filter((cacheName) => !currentCaches.includes(cacheName));
    }).then((cachesToDelete) => {
      return Promise.all(
        cachesToDelete.map((cacheToDelete) => {
          console.log('[ServiceWorker] Deleting old cache:', cacheToDelete);
          return caches.delete(cacheToDelete);
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event - network first, falling back to cache
self.addEventListener('fetch', (event) => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    // For API requests, always try network
    if (event.request.url.includes('/api/')) {
      event.respondWith(
        fetch(event.request).catch(() => {
          return new Response(
            JSON.stringify({ error: 'Offline', message: 'You are currently offline' }),
            {
              status: 503,
              headers: { 'Content-Type': 'application/json' },
            }
          );
        })
      );
      return;
    }
    return;
  }

  // For navigation requests, use network first
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the latest version
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fall back to cached version
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return cached index.html as fallback for SPA routing
            return caches.match('/index.html');
          });
        })
    );
    return;
  }

  // For static assets, use cache first
  if (event.request.url.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff2?)$/)) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version and update cache in background
          fetch(event.request).then((response) => {
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(event.request, response);
            });
          });
          return cachedResponse;
        }
        // Not in cache, fetch and cache
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Don't cache if not a successful response
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        // Cache successful responses
        const responseClone = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Return cached version if available
        return caches.match(event.request);
      })
  );
});

// Handle background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-likes') {
    event.waitUntil(syncLikes());
  }
  if (event.tag === 'sync-history') {
    event.waitUntil(syncHistory());
  }
});

// Sync likes when back online
async function syncLikes() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const pendingLikes = await cache.match('pending-likes');
    if (pendingLikes) {
      const likes = await pendingLikes.json();
      // Sync with server
      for (const like of likes) {
        await fetch('/api/likes', {
          method: 'POST',
          body: JSON.stringify(like),
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Clear pending likes
      await cache.delete('pending-likes');
    }
  } catch (err) {
    console.error('[ServiceWorker] Sync likes failed:', err);
  }
}

// Sync history when back online
async function syncHistory() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const pendingHistory = await cache.match('pending-history');
    if (pendingHistory) {
      const history = await pendingHistory.json();
      // Sync with server
      for (const item of history) {
        await fetch('/api/history', {
          method: 'POST',
          body: JSON.stringify(item),
          headers: { 'Content-Type': 'application/json' },
        });
      }
      // Clear pending history
      await cache.delete('pending-history');
    }
  } catch (err) {
    console.error('[ServiceWorker] Sync history failed:', err);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update available',
    icon: '/logo192.png',
    badge: '/logo192.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'Open' },
      { action: 'close', title: 'Close' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'MediaCore', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle messages from main thread
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
  if (event.data.type === 'CACHE_MEDIA') {
    // Cache media file for offline playback
    cacheMedia(event.data.url);
  }
});

// Cache media for offline playback
async function cacheMedia(url) {
  try {
    const cache = await caches.open('mediacore-media');
    const response = await fetch(url);
    await cache.put(url, response);
    console.log('[ServiceWorker] Cached media:', url);
  } catch (err) {
    console.error('[ServiceWorker] Failed to cache media:', err);
  }
}

console.log('[ServiceWorker] Service Worker loaded');
