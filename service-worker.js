self.addEventListener("install", event => {
  event.waitUntil(
    caches.open("foto-showfest-v1").then(cache => {
      return cache.addAll([
        "./",
        "./index.html",
        "./style.css",
        "./script.js",
        "./manifest.json",
        "./moldura.png",
        "./galeria.png",
        "./beep.mp3",
        "./icon_192x192.png",
        "./icon_512x512.png",
        "./screenshot1.jpg",
        "https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"
      ]);
    })
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      return response || fetch(event.request);
    })
  );
});