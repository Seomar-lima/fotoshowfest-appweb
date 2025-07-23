const CACHE_NAME = "foto-show-fest-cache-v1";
const urlsToCache = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "moldura.png",
  "beep.mp3",
  "icons/icon-192.png",
  "icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
