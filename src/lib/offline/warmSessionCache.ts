// src/lib/offline/warmSessionCache.ts
"use client";

// Duplicated from public/sw.js, which is a static file and cannot be imported.
// serviceWorker.test.ts asserts the two agree.
export const PAGE_CACHE = "onyx-shell-v4";

// A soft navigation issues an RSC fetch, not a document request, so the
// worker's navigate branch never fires and a session page reached by tapping
// a routine is never cached. Measured 2026-08-10. This warms it explicitly.
//
// Best effort throughout: every failure leaves the app exactly as it behaves
// without this function, so nothing here may throw to the caller.
export async function warmSessionCache(path: string): Promise<void> {
  try {
    if (typeof caches === "undefined") return;
    if (!navigator.onLine) return;
    if (!navigator.serviceWorker?.controller) return;
    const response = await fetch(path);
    if (!response.ok) return;
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
