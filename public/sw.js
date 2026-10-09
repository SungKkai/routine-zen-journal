const CACHE = "kronos-v2";
const SHELL = ["/", "/manifest.webmanifest", "/icon-192.png", "/icon-512.png", "/favicon.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigations: network first, fall back to the cached shell when offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/").then((hit) => hit ?? Response.error())),
    );
    return;
  }

  const isCode = ["script", "style", "worker"].includes(req.destination)
    || url.pathname.startsWith("/node_modules/")
    || url.pathname.startsWith("/@vite/");

  // Code must be network-first so an update never mixes old React/router files.
  if (isCode) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? Response.error())),
    );
    return;
  }

  // Images and other static files can remain cache-first.
  event.respondWith(
    caches.match(req).then((hit) => hit ?? fetch(req).then((res) => {
      if (res.ok && res.type === "basic") {
        const copy = res.clone();
        caches.open(CACHE).then((cache) => cache.put(req, copy));
      }
      return res;
    })),
  );
});
