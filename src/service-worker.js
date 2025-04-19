/// <reference lib="webworker" />
// @ts-check

// Basic service worker that caches assets
const CACHE_NAME = "habistat-cache-v1";

// Assets to cache immediately
const PRECACHE_ASSETS = [
  "/",
  "/manifest.webmanifest",
  "/app-192x192.png",
  "/app-512x512.png",
  "/maskable-icon-512x512.png",
  "/screenshots/screenshot-mobile.png",
  "/screenshots/screenshot-desktop.png"
];

/**
 * @param {Event} event
 * @returns {event is ExtendableEvent}
 */
function isExtendableEvent(event) {
  return "waitUntil" in event;
}

/**
 * @param {Event} event
 * @returns {event is FetchEvent}
 */
function isFetchEvent(event) {
  return "respondWith" in event && "request" in event;
}

self.addEventListener("install", (event) => {
  if (isExtendableEvent(event)) {
    event.waitUntil(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  if (isFetchEvent(event)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached version if found
        if (response) {
          return response;
        }

        // Clone the request because it can only be used once
        const fetchRequest = event.request.clone();

        // Make network request and cache the response
        return fetch(fetchRequest).then((response) => {
          // Check if we received a valid response
          if (!response || response.status !== 200 || response.type !== "basic") {
            return response;
          }

          // Clone the response because it can only be used once
          const responseToCache = response.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return response;
        });
      })
    );
  }
});

self.addEventListener("activate", (event) => {
  if (isExtendableEvent(event)) {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
  }
});
