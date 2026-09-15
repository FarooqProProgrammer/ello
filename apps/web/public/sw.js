/* Ello service worker: push reminders + offline flashcards. Registered as /sw.js (add ?dev=1 to skip caching). */
const CACHE = "ello-v1";
const OFFLINE_URL = "/offline-review";
const DEV = new URL(self.location.href).searchParams.has("dev");

self.addEventListener("install", (event) => {
  if (!DEV) {
    event.waitUntil(
      caches
        .open(CACHE)
        .then((cache) => cache.addAll([OFFLINE_URL, "/manifest.webmanifest", "/icons/192"]))
        .catch(() => undefined),
    );
  }
  self.skipWaiting();
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
  if (DEV) return;
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Built assets are content-hashed: cache first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((response) => {
            if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
            return response;
          }),
      ),
    );
    return;
  }

  // Due cards: network first, fall back to the last download.
  if (url.pathname === "/api/review/due") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) caches.open(CACHE).then((cache) => cache.put(request, response.clone()));
          return response;
        })
        .catch(() => caches.match(request).then((hit) => hit || Response.json({ cards: [], savedAt: null }))),
    );
    return;
  }

  // Pages: network first; offline, show the offline flashcards page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (url.pathname === OFFLINE_URL && response.ok) caches.open(CACHE).then((cache) => cache.put(OFFLINE_URL, response.clone()));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL).then((hit) => hit || new Response("You're offline.", { headers: { "Content-Type": "text/plain" } }))),
    );
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Ello", {
      body: data.body || "Time to practise English.",
      icon: "/icons/192",
      badge: "/icons/192",
      data: { url: data.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const client of windows) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
