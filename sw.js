const CACHE_NAME = 'pomodoro-v6';
const urlsToCache = [
  '/time/',
  '/time/index.html',
  '/time/shimmer.mp3',
  '/time/manifest.json',
  '/time/icon-192.png',
  '/time/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Crimson+Text:wght@400;600&display=swap'
];

// Install event - cache all resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // Immediately activate new service worker
  );
});

// Fetch event - network-first for HTML, cache-first for assets
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Network-first for HTML pages (so users get updates immediately when online)
  if (event.request.mode === 'navigate' ||
      url.pathname === '/time/' ||
      url.pathname === '/time/index.html' ||
      url.pathname.endsWith('.html')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh HTML
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Offline - serve from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // Cache-first for other assets (images, audio, fonts)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control of all pages immediately
  );
});
