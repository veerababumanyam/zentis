const CACHE_NAME = 'zentis-cache-v2';
const URLS_TO_CACHE = [
    '/',
    '/index.html',
    '/site.webmanifest',
    '/index.css',
    '/favicon.ico',
    '/logo.png',
    '/logo-dark.png',
    '/android-chrome-192x192.png',
    '/android-chrome-512x512.png',
    '/apple-touch-icon.png'
];

// Install Event - Cache Files
self.addEventListener('install', (event) => {
    // Activate new service worker immediately (don't wait for old one to be released)
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache');
                return cache.addAll(URLS_TO_CACHE);
            })
    );
});

// Activate Event - Clean up old caches and take control immediately
self.addEventListener('activate', (event) => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Skip cross-origin requests entirely (API calls, CDN resources, Firebase Storage)
    // Let the browser handle them natively — avoids null response errors
    if (url.origin !== self.location.origin) {
        return;
    }

    // Only cache GET requests — skip POST/PUT/DELETE (e.g., file uploads)
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Cache hit - return response
                if (response) {
                    return response;
                }
                return fetch(event.request)
                    .then((response) => {
                        // Check if we received a valid response
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }

                        // Clone the response
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then((cache) => {
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    })
                    .catch(() => {
                        // Fallback for navigation requests (e.g., /dashboard) to index.html for SPA
                        if (event.request.mode === 'navigate') {
                            return caches.match('/index.html');
                        }
                        // Return a proper Response for non-navigation requests to avoid null respondWith error
                        return new Response('Network error', { status: 408, statusText: 'Request Timeout' });
                    });
            })
    );
});
