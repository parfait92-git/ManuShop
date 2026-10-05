// Minimal PWA service worker: cache-first for Cloudinary images, network-first for pages (offline fallback).
const CACHE_NAME = "manushop-cache-v1";
// Version du service worker : la modifier suffit à faire installer la
// nouvelle version par les navigateurs (ici : notifications push).
const SW_VERSION = "2026-10-04-push";
const IMAGE_CACHE = "manushop-images-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME && key !== IMAGE_CACHE)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Cache-first for Cloudinary-delivered images.
  if (url.hostname.endsWith("res.cloudinary.com")) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  // Network-first for navigation requests, falling back to cache when offline.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.open(CACHE_NAME).then((cache) => cache.match(request)))
    );
  }
});

// Notifications push (2026-10-04) : messages « données seulement » envoyés
// par le serveur (`src/server/push/sendPush.ts`) via Firebase Cloud
// Messaging — affichés ici, au même format sur tous les navigateurs.
self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  // FCM range les données dans `data` ; un envoi direct les met à la racine.
  const data = payload.data || payload;
  const title = data.title || "ManuShop";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag || undefined,
      renotify: Boolean(data.tag),
      data: { link: data.link || "/" },
    })
  );
});

// Toucher la notification : ouvre la page liée, dans un onglet de ManuShop
// déjà ouvert si possible.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.link || "/", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        return open.focus().then(() => (open.navigate ? open.navigate(target) : undefined));
      }
      return self.clients.openWindow(target);
    })
  );
});
