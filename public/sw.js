const CACHE = "onyx-shell-v4";
const SHELL = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      // Assets repopulate as the user browses. This resets the static cache
      // whenever this worker's bytes change, which is NOT every deploy: sw.js
      // is a static file, so a new worker installs only when this file is
      // edited. Growth between those edits is therefore not bounded here, and
      // is accepted for an app of this size.
      const cache = await caches.open(CACHE);
      const stale = (await cache.keys()).filter((req) =>
        new URL(req.url).pathname.startsWith("/_next/static/"),
      );
      await Promise.all(stale.map((req) => cache.delete(req)));
    })(),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  // Build output is content hashed, so a given URL's bytes can never change
  // and cache first cannot serve anything stale. This is what lets a cached
  // page hydrate offline, which is what reads IndexedDB.
  if (new URL(request.url).pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              // A failed write (quota on iOS Safari, eviction) is not
              // actionable: the response is already on its way to the page,
              // and the next request simply tries again.
              caches
                .open(CACHE)
                .then((c) => c.put(request, copy))
                .catch(() => {});
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Navigations (e.g. reloading /log/<id> while offline): try the network,
  // cache the result for next time, and fall back to the cached page or the
  // app shell when offline so the client can rehydrate from IndexedDB.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Only cache successful same-origin workout pages, so a redirect to
          // /sign-in or an error page is never stored and replayed offline.
          const path = new URL(request.url).pathname;
          if (response.ok && response.type === "basic" && path.startsWith("/log/")) {
            const copy = response.clone();
            // Not actionable either, for the same reason.
            caches
              .open(CACHE)
              .then((c) => c.put(request, copy))
              .catch(() => {});
          }
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((cached) => cached || caches.match("/"))
        )
    );
    return;
  }

  // Below the navigate branch on purpose: an offline navigation to /log/ must
  // still be answered from the cache, which is the whole feature, and only
  // requests that are not navigations reach this far.
  //
  // The only non-navigate GET for a session page is the client warming this
  // cache. Answering that from the cache would hand the warm the entry it
  // wrote itself, so it would re-store an identical body and the page would
  // stay pinned to the session's first mount forever. A soft navigation's RSC
  // request carries _rsc in the query, so it is a different key that misses
  // here anyway and already went to the network.
  const path = new URL(request.url).pathname;
  if (path.startsWith("/log/")) {
    event.respondWith(fetch(request));
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {};
  }
  const title = data.title || "Onyx";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.tag || "onyx",
    data: { url: data.url || "/" },
  };
  // A rest ending while the app is open already played a local beep, so a
  // banner as well is duplicate feedback for one event. Only the rest tag is
  // suppressed; a personal record or goal push still shows.
  event.waitUntil(
    (async () => {
      if (options.tag === "rest") {
        const clientList = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        const visible = clientList.some((c) => c.visibilityState === "visible");
        if (visible) return;
      }
      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(url) && "focus" in client) {
            return client.focus();
          }
        }
        if (self.clients.openWindow) return self.clients.openWindow(url);
      }),
  );
});
