// src/lib/offline/__tests__/warmSessionCache.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { warmSessionCache, PAGE_CACHE } from "@/lib/offline/warmSessionCache";

const put = vi.fn();
const originalFetch = globalThis.fetch;
const ORIGIN = "http://x";

// Backed by a real map so keys() and delete() mean something. The previous
// stub exposed put alone, and because the whole function body sits in one
// try, a missing method threw into its own catch and every test passed while
// the eviction never ran.
let entries: Map<string, unknown>;

function seed(...paths: string[]) {
  for (const p of paths) entries.set(new URL(p, ORIGIN).href, `body:${p}`);
}

function stored(): string[] {
  return [...entries.keys()].sort();
}

function setup(over: { online?: boolean; hasServiceWorker?: boolean } = {}) {
  put.mockReset();
  entries = new Map();
  // cache.put resolves a relative key against the document base, and that
  // absolute URL is what the worker later looks up. The map mirrors it.
  put.mockImplementation(async (key: string, res: unknown) => {
    entries.set(new URL(key, ORIGIN).href, res);
  });
  const cache = {
    put,
    keys: async () => [...entries.keys()].map((url) => ({ url })),
    delete: async (req: { url: string }) => entries.delete(req.url),
  };
  vi.stubGlobal("caches", { open: vi.fn(async () => cache) });
  const nav: Record<string, unknown> = { onLine: over.online ?? true };
  // Omitting the key entirely (rather than setting it to undefined) is what
  // makes "serviceWorker" in navigator false, matching a browser with no
  // support at all.
  if (over.hasServiceWorker ?? true) {
    nav.serviceWorker = { ready: Promise.resolve() };
  }
  vi.stubGlobal("navigator", nav);
  globalThis.fetch = vi.fn(async () => ({
    ok: true,
    redirected: false,
  })) as unknown as typeof fetch;
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

  // An expired session is redirected to /sign-in, and fetch follows redirects,
  // so this arrives as a 200 holding the wrong page. Caching it under the
  // workout's key would replay a sign-in page as the workout on the next
  // offline reload.
  it("does not store a response that was redirected elsewhere", async () => {
    globalThis.fetch = vi.fn(async () => ({
      ok: true,
      redirected: true,
    })) as unknown as typeof fetch;
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

  // startSession redirects to an already open session rather than inserting a
  // second, so every other /log/ entry belongs to a workout that can never be
  // navigated to again.
  it("evicts a session page belonging to an older workout", async () => {
    seed("/log/a");
    await warmSessionCache("/log/b");
    expect(stored()).toEqual([`${ORIGIN}/log/b`]);
  });

  // The eviction must not widen into the shell or the build output, which is
  // what lets a cached page hydrate with no connection.
  it("leaves the shell and the build output alone", async () => {
    seed("/", "/_next/static/chunks/main.abc.js");
    await warmSessionCache("/log/b");
    expect(stored()).toEqual([
      `${ORIGIN}/`,
      `${ORIGIN}/_next/static/chunks/main.abc.js`,
      `${ORIGIN}/log/b`,
    ]);
  });

  // A soft navigation's RSC request carries a query, so the same page appears
  // under a second key. Comparing whole URLs would keep it forever.
  it("evicts an older workout keyed with an RSC query", async () => {
    seed("/log/a?_rsc=abc123");
    await warmSessionCache("/log/b");
    expect(stored()).toEqual([`${ORIGIN}/log/b`]);
  });

  // Warming is best effort throughout. A failed eviction must leave the app
  // exactly as it behaves without this function, and must not undo the put
  // that already succeeded.
  it("never rejects when the eviction fails", async () => {
    // This stub hardcodes keys(), so there is nothing to seed.
    vi.stubGlobal("caches", {
      open: vi.fn(async () => ({
        put,
        keys: async () => [{ url: `${ORIGIN}/log/a` }],
        delete: async () => {
          throw new Error("quota");
        },
      })),
    });
    await expect(warmSessionCache("/log/b")).resolves.toBeUndefined();
    expect(put).toHaveBeenCalledTimes(1);
  });
});
