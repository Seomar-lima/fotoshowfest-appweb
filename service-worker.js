const STATIC_CACHE = "foto-showfest-static-v1";
const DYNAMIC_CACHE = "foto-showfest-dynamic-v1";
const STATIC_ASSETS = [
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

// Instalação: salva cache estático
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Ativação: remove caches antigos
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
          .map(key => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Função para limitar tamanho do cache dinâmico
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxItems) {
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxItems);
  }
}

// Fetch: usa cache primeiro para estáticos, e cache dinâmico para imagens externas
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);

  // Serve estáticos do cache
  if (STATIC_ASSETS.includes(url.href) || STATIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then(res => res || fetch(request))
    );
    return;
  }

  // Para imagens dinâmicas (imgbb, gofile etc)
  if (
    url.hostname.includes("gofile.io") ||
    url.hostname.includes("imgbb.com") ||
    url.pathname.endsWith(".webm") ||
    url.pathname.endsWith(".mp4") ||
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".png")
  ) {
    event.respondWith(
      caches.open(DYNAMIC_CACHE).then(cache =>
        fetch(request)
          .then(response => {
            cache.put(request, response.clone());
            limitCacheSize(DYNAMIC_CACHE, 30);
            return response;
          })
          .catch(() => caches.match(request))
      )
    );
    return;
  }

  // Fallback genérico
  event.respondWith(
    fetch(request).catch(() => caches.match("./index.html"))
  );
});
