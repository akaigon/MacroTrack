// =============================================================================
// sw.js — a small service worker that makes the app work offline.
//
// Strategy:
//   - Navigations (opening a page): try the network first, fall back to the
//     cached page if you're offline.
//   - Other GET requests (JS, CSS, icons): serve from cache if present, and
//     update the cache in the background ("stale-while-revalidate").
//   - We never cache the food-search API calls (they need the network anyway).
//
// Your actual data isn't here — it lives in IndexedDB, which already works
// offline. This worker just makes sure the app SHELL loads without a network.
// =============================================================================

const CACHE = "macrotrack-v1";

// Take control immediately on install/activate.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop old caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle same-origin GET requests.
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Don't cache API routes (search/barcode need fresh network data).
  if (url.pathname.startsWith("/api/")) return;

  // Page navigations: network-first, fall back to cache (then to "/").
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(request, fresh.clone());
          return fresh;
        } catch {
          const cache = await caches.open(CACHE);
          return (await cache.match(request)) || (await cache.match("/")) || Response.error();
        }
      })()
    );
    return;
  }

  // Everything else: stale-while-revalidate.
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      const network = fetch(request)
        .then((res) => {
          if (res && res.status === 200) cache.put(request, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })()
  );
});
