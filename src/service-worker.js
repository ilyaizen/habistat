/// <reference lib="webworker" />
// @ts-check

// Basic service worker that caches assets
const CACHE_NAME = "habistat-cache-v1";

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
        return cache.addAll([
          "/",
          "/index.html",
          "/manifest.webmanifest",
          "/app-192x192.png",
          "/app-512x512.png",
          "/maskable-icon-512x512.png",
          "/screenshots/screenshot-mobile.png",
          "/screenshots/screenshot-mobile.png",
          "/screenshots/screenshot-desktop.png"
        ]);
      })
    );
  }
});

self.addEventListener("fetch", (event) => {
  if (isFetchEvent(event)) {
    event.respondWith(
      caches.match(event.request).then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
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
