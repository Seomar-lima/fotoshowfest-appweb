const CACHE_NAME = "foto-showfest-v1";
const ASSETS_TO_CACHE = [
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
];

// Instalação: cacheia arquivos essenciais
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

// Ativação: limpa caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch: serve do cache se possível, senão busca online
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response || fetch(event.request).catch(() =>
        caches.match("./index.html")
      )
    )
  );
});
