const CACHE_NAME = 'pomodoro-v8';
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

  // Handle range requests (browsers use these for audio streaming)
  if (event.request.headers.has('range')) {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        if (!cachedResponse) {
          return fetch(event.request);
        }
        const rangeHeader = event.request.headers.get('range');
        const matches = rangeHeader.match(/bytes=(\d+)-(\d*)/);
        if (!matches) return cachedResponse;
        return cachedResponse.arrayBuffer().then(buffer => {
          const start = parseInt(matches[1]);
          const end = matches[2] !== '' ? parseInt(matches[2]) : buffer.byteLength - 1;
          const sliced = buffer.slice(start, end + 1);
          return new Response(sliced, {
            status: 206,
            statusText: 'Partial Content',
            headers: {
              'Content-Type': cachedResponse.headers.get('Content-Type') || 'audio/mpeg',
              'Content-Range': `bytes ${start}-${end}/${buffer.byteLength}`,
              'Content-Length': String(sliced.byteLength),
              'Accept-Ranges': 'bytes',
            }
          });
        });
      })
    );
    return;
  }

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
