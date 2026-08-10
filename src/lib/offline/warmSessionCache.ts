// src/lib/offline/warmSessionCache.ts
"use client";

// Duplicated from public/sw.js, which is a static file and cannot be imported.
// serviceWorker.test.ts asserts the two agree.
export const PAGE_CACHE = "onyx-shell-v4";

// A soft navigation issues an RSC fetch, not a document request, so the
// worker's navigate branch never fires and a session page reached by tapping
// a routine is never cached. Measured 2026-08-10. This warms it explicitly.
//
// Warming does not need a controller: the Cache API belongs to the page
// itself, so an entry can be written before any worker exists. What matters
// is only that a worker will eventually be there to read it, so this waits
// for one to become active rather than bailing when none has claimed the
// page yet. Skipping on an absent controller would race register, install,
// activate and claim, and losing that race means a brand new install, or a
// fresh browser context that has no prior registration at all, never gets
// warmed.
//
// Best effort throughout: every failure leaves the app exactly as it behaves
// without this function, so nothing here may throw to the caller.
export async function warmSessionCache(path: string): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    if (!navigator.onLine) return;
    if (!("serviceWorker" in navigator)) return;
    // Wait for an active worker rather than skipping when none has claimed
    // this page yet.
    await navigator.serviceWorker.ready;
    const response = await fetch(path);
    if (!response.ok) return;
    // A redirect means the workout page is not what came back. An expired
    // session is sent to /sign-in by the proxy, and fetch follows that, so
    // this is a 200 carrying the wrong page. Stored under the /log/ key it
    // would be replayed as the workout on the next offline reload. The
    // worker's navigate branch already refuses these, via response.type.
    if (response.redirected) return;
    const cache = await caches.open(PAGE_CACHE);
    // A relative path is correct here and must not be "fixed" to an absolute
    // URL. cache.put builds a Request from it, which resolves against the
    // document base, so the stored key is the same absolute URL the worker
    // later looks up with caches.match(navigationRequest).
    await cache.put(path, response);
  } catch {
    // Deliberately silent. See above.
  }
}
