const CACHE_NAME = "imagesjw-v1";

const PRECACHE = [
  "/images_jw/",
  "/images_jw/index.html",
  "/images_jw/icons/icon-192.png",
  "/images_jw/icons/icon-512.png",
  // Se hai file locali aggiuntivi, scommenta e aggiungi:
  // "/images_jw/styles.css",
  // "/images_jw/app.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : undefined)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // HTML: network-first con fallback alla cache (index.html)
  if (req.mode === "navigate" || req.destination === "document") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match("/images_jw/index.html"))
        )
    );
    return;
  }

  // Statici/immagini stessa origine: cache-first
  if (
    req.method === "GET" &&
    (req.destination === "image" ||
     req.destination === "style" ||
     req.destination === "script" ||
     req.destination === "font")
  ) {
    const sameOrigin = url.origin === self.location.origin;

    // Immagini terze parti: lascia rete (evita riempire cache)
    if (!sameOrigin && req.destination === "image") return;

    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached;
        return fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        });
      })
    );
  }
});
