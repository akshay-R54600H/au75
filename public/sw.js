// AU75 service worker — app shell offline cache + background push.
// Navigations: network first, fall back to cached page (or /dashboard).
// Hashed build assets (/_next/static): cache first (they never change).
// Other static files (icons, fonts): serve cached, refresh in the background.
// API calls are never cached. Only successful responses are stored, so a
// 404/500 seen mid-deploy can never get stuck in a student's cache.
const CACHE = "au75-v3";
const SHELL = ["/", "/dashboard", "/subjects", "/calendar", "/settings", "/policy", "/manifest.json"];
// Old build chunks pile up across deploys; keep the cache bounded.
const MAX_ENTRIES = 150;

self.addEventListener("install", (e) => {
  // Cache each shell page independently: one failure must not abort the update.
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.all(SHELL.map((url) => c.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function cacheable(res) {
  return res && res.ok && res.type === "basic";
}

/** Store a copy, then drop the oldest entries beyond MAX_ENTRIES. */
function store(request, res) {
  if (!cacheable(res)) return;
  const copy = res.clone();
  caches.open(CACHE).then(async (c) => {
    await c.put(request, copy);
    const keys = await c.keys();
    const shell = new Set(SHELL.map((p) => new URL(p, location.origin).href));
    const extra = keys.filter((k) => !shell.has(k.url));
    for (const k of extra.slice(0, Math.max(0, keys.length - MAX_ENTRIES))) await c.delete(k);
  });
}

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
          store(request, res);
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match("/dashboard")))
    );
    return;
  }

  // Content-hashed build output: safe to serve from cache forever.
  if (url.pathname.startsWith("/_next/static/")) {
    e.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            store(request, res);
            return res;
          })
      )
    );
    return;
  }

  // Unhashed static files: stale-while-revalidate so updates still arrive.
  if (url.pathname.startsWith("/icons/") || /\.(png|svg|ico|woff2?)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(request).then((hit) => {
        const network = fetch(request)
          .then((res) => {
            store(request, res);
            return res;
          })
          .catch(() => hit);
        return hit || network;
      })
    );
  }
});

// Class reminders pushed by the server (/api/cron/send-notifications) while
// the app is closed. Payload: { title, body, tag, data: { url, ... } }.
self.addEventListener("push", (e) => {
  let payload = {};
  try {
    payload = e.data ? e.data.json() : {};
  } catch {
    payload = { body: e.data ? e.data.text() : "" };
  }
  const title = payload.title || "AU75";
  e.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || "",
      tag: payload.tag,
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: payload.data || {},
    })
  );
});

// Tapping a notification focuses an open AU75 tab, or opens one.
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const target = new URL((e.notification.data && e.notification.data.url) || "/dashboard", location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      for (const w of windows) {
        if (new URL(w.url).origin === location.origin) {
          return w.focus().then((c) => (c && "navigate" in c ? c.navigate(target) : c));
        }
      }
      return self.clients.openWindow(target);
    })
  );
});
