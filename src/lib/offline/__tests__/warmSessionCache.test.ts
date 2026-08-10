// src/lib/offline/__tests__/warmSessionCache.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { warmSessionCache, PAGE_CACHE } from "@/lib/offline/warmSessionCache";

const put = vi.fn();
const originalFetch = globalThis.fetch;

function setup(over: { online?: boolean; hasServiceWorker?: boolean } = {}) {
  put.mockReset();
  vi.stubGlobal("caches", { open: vi.fn(async () => ({ put })) });
  const nav: Record<string, unknown> = { onLine: over.online ?? true };
  // Omitting the key entirely (rather than setting it to undefined) is what
  // makes "serviceWorker" in navigator false, matching a browser with no
  // support at all.
  if (over.hasServiceWorker ?? true) {
    nav.serviceWorker = { ready: Promise.resolve() };
  }
  vi.stubGlobal("navigator", nav);
  globalThis.fetch = vi.fn(async () => ({ ok: true })) as unknown as typeof fetch;
}

afterEach(() => {
  vi.unstubAllGlobals();
  globalThis.fetch = originalFetch;
});

beforeEach(() => setup());

describe("warmSessionCache", () => {
  it("fetches the path and stores the response", async () => {
    await warmSessionCache("/log/abc");
    expect(globalThis.fetch).toHaveBeenCalledWith("/log/abc");
    // The entry is useless anywhere but the cache the worker reads.
    expect(caches.open).toHaveBeenCalledWith(PAGE_CACHE);
    expect(put).toHaveBeenCalledTimes(1);
    // The key is the relative path, which cache.put resolves against the
    // document base, producing the same absolute URL the worker later looks up
    // for the navigation. Rebuilding it as an absolute URL here, which reads
    // like a tidy-up, can key the entry differently and the offline reload
    // then misses.
    expect(put).toHaveBeenCalledWith("/log/abc", expect.anything());
  });

  it("does nothing while offline", async () => {
    setup({ online: false });
    await warmSessionCache("/log/abc");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("does nothing when the browser has no service worker support", async () => {
    setup({ hasServiceWorker: false });
    await warmSessionCache("/log/abc");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  // A fresh install (registration in flight) and a fresh Playwright context
  // (no prior registration at all) both start with no controller yet. The
  // fetch must wait for navigator.serviceWorker.ready rather than firing
  // before, or racing, whatever claims the page.
  it("waits for the service worker to become ready before fetching", async () => {
    let resolveReady!: () => void;
    const ready = new Promise<void>((resolve) => {
      resolveReady = resolve;
    });
    vi.stubGlobal("navigator", { onLine: true, serviceWorker: { ready } });

    const promise = warmSessionCache("/log/abc");
    await Promise.resolve();
    await Promise.resolve();
    expect(globalThis.fetch).not.toHaveBeenCalled();

    resolveReady();
    await promise;
    expect(globalThis.fetch).toHaveBeenCalledWith("/log/abc");
  });

  it("does not store a failed response", async () => {
    globalThis.fetch = vi.fn(async () => ({ ok: false })) as unknown as typeof fetch;
    await warmSessionCache("/log/abc");
    expect(put).not.toHaveBeenCalled();
  });

  // Warming is best effort. A page that cannot be warmed behaves exactly as
  // it does today, so a rejection must never reach the caller's mount effect.
  it("never rejects when the fetch throws", async () => {
    globalThis.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    await expect(warmSessionCache("/log/abc")).resolves.toBeUndefined();
  });

  it("never rejects when the Cache API is absent", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(warmSessionCache("/log/abc")).resolves.toBeUndefined();
  });
});
