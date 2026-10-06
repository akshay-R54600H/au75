// AU75 service worker — app shell offline cache.
// Navigations: network first, fall back to cached page (or /dashboard).
// Static assets (/_next/static, icons, fonts): cache first.
// API calls are never cached.
const CACHE = "au75-v2";
const SHELL = ["/", "/dashboard", "/subjects", "/calendar", "/settings", "/policy", "/manifest.json"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== location.origin ||
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/admin")
  )
    return;

  if (request.mode === "navigate") {
    e.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/dashboard")))
    );
    return;
  }

  const isStatic =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    /\.(png|svg|ico|woff2?)$/.test(url.pathname);

  if (isStatic) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
            return res;
          })
      )
    );
  }
});

// ------------------------------------------------------------
// Notification Click: Open or focus AU75
// ------------------------------------------------------------
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const targetUrl = (e.notification.data && e.notification.data.url) || "/calendar";

  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          if ("navigate" in client && client.url !== targetUrl) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ------------------------------------------------------------
// Push notification handler (where supported)
// ------------------------------------------------------------
self.addEventListener("push", (e) => {
  if (!e.data) return;
  try {
    const payload = e.data.json();
    const title = payload.title || "🔔 Upcoming Class";
    const options = {
      body: payload.body || "You have an upcoming class scheduled.",
      icon: "/icon.svg",
      badge: "/icon.svg",
      tag: payload.tag || "au75-class-notification",
      vibrate: [200, 100, 200],
      renotify: true,
      data: payload.data || { url: "/calendar" },
    };
    e.waitUntil(self.registration.showNotification(title, options));
  } catch {
    const text = e.data.text();
    e.waitUntil(
      self.registration.showNotification("🔔 AU75 Notifications", {
        body: text || "Upcoming class alert.",
        icon: "/icon.svg",
        badge: "/icon.svg",
        vibrate: [200, 100, 200],
        renotify: true,
        data: { url: "/calendar" },
      })
    );
  }
});


