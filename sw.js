const CACHE_NAME = "salaam-garmets-v2";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];
// Shop data (products/categories/config) and uploads come from here — the
// page itself handles freshness for these, so the service worker stays out
// of the way instead of serving a stale cached copy.
const API_ORIGIN = "https://shop-images.okulloz-shop.workers.dev";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate for the app shell and static assets: respond from
// cache immediately (instant open), then refresh the cache in the
// background so the next open has the latest version.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin === API_ORIGIN) return; // let the page's own logic handle this

  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => cached || (req.mode === "navigate" ? caches.match("./index.html") : undefined));
      return cached || networkFetch;
    })
  );
});
