// Service Worker: cache offline para la app del plan de entrenamiento
const CACHE_NAME = "plan15nov-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./app.js",
  "./data.js",
  "./auth.js",
  "./config.js",
  "./ejercicios.js",
  "./parser.js",
  "./progresion.js",
  "./arboles.js",
  "./modelo1.js",
  "./modelo2.js",
  "./ml/modelo1_arbol.json",
  "./ml/modelo2_bosque.json",
  "./manifest.webmanifest",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // no cachear llamadas a Supabase (auth/API en tiempo real, ni el CDN del SDK)
  if (url.hostname.endsWith("supabase.co") || url.hostname.includes("supabase.com") || url.hostname === "cdn.jsdelivr.net") {
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => {
      const fetchPromise = fetch(event.request)
        .then((networkRes) => {
          if (networkRes && networkRes.status === 200) {
            const clone = networkRes.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkRes;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
