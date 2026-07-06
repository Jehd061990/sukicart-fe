const CACHE_NAME = "sukicart-pwa-v1";
const RUNTIME_CACHE = "sukicart-runtime-v1";

const CORE_ASSETS = ["/", "/manifest.webmanifest", "/favicon.ico"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== RUNTIME_CACHE) {
            return caches.delete(key);
          }

          return Promise.resolve();
        }),
      ),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, copy);
          });
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(RUNTIME_CACHE);
          const cached = await cache.match(request);
          if (cached) {
            return cached;
          }

          return caches.match("/");
        }),
    );
    return;
  }

  const isStaticAsset =
    url.origin === self.location.origin &&
    (url.pathname.startsWith("/_next/") ||
      url.pathname.startsWith("/icons/") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith(".woff2"));

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);

        return cached || fetchPromise;
      }),
    );
    return;
  }

  const isProductsApi = url.pathname.includes("/api/products");

  if (isProductsApi) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || new Response(JSON.stringify({ products: [] }), {
            headers: { "Content-Type": "application/json" },
          });
        }),
    );
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag !== "sukicart-pos-sync") {
    return;
  }

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({ type: "SUKICART_SYNC_QUEUE" });
      });
    }),
  );
});
