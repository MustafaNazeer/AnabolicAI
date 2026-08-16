// src/lib/offline/__tests__/serviceWorker.test.ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PAGE_CACHE } from "@/lib/offline/warmSessionCache";
import { appName } from "@/lib/app";

type Handler = (event: unknown) => void;

const ORIGIN = "http://x";

// Derived rather than typed out. A version bump is then one line in
// warmSessionCache.ts and one in public/sw.js, not thirteen here, and the
// pin at the bottom of this file is what proves the two agree.
const CACHE_NAME = PAGE_CACHE;

// public/sw.js is a static file that cannot be imported, so it is read as
// text and evaluated with a fake worker scope. This tests the file that
// actually ships rather than a reimplementation of it.
function loadWorker(cacheContents: Record<string, string[]> = {}) {
  const src = readFileSync("public/sw.js", "utf8");
  const listeners: Record<string, Handler> = {};

  const stores = new Map<string, Map<string, string>>();
  for (const [name, urls] of Object.entries(cacheContents)) {
    stores.set(name, new Map(urls.map((u) => [u, `body:${u}`])));
  }

  const openCache = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const m = stores.get(name)!;
    return {
      addAll: async (urls: string[]) =>
        urls.forEach((u) => m.set(new URL(u, ORIGIN).href, `body:${u}`)),
      put: async (req: { url: string }, res: unknown) => m.set(req.url, String(res)),
      keys: async () => [...m.keys()].map((url) => ({ url })),
      match: async (req: { url: string }) => m.get(req.url) ?? undefined,
      delete: async (req: { url: string } | string) =>
        m.delete(typeof req === "string" ? new URL(req, ORIGIN).href : req.url),
    };
  };

  const caches = {
    open: async (name: string) => openCache(name),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    // The browser resolves a relative URL against the worker's scope, so
    // caches.match("/") looks up the absolute origin root. Without this the
    // shell fallback silently misses and offline tests pass for the wrong
    // reason. Measured: this exact bug appeared while building the harness.
    match: async (req: { url: string } | string) => {
      const url = new URL(typeof req === "string" ? req : req.url, ORIGIN).href;
      for (const m of stores.values()) if (m.has(url)) return m.get(url);
      return undefined;
    },
  };

  const self = {
    addEventListener: (type: string, fn: Handler) => {
      listeners[type] = fn;
    },
    skipWaiting: vi.fn(),
    clients: { claim: vi.fn(), matchAll: vi.fn(async () => []) },
    registration: { showNotification: vi.fn(async () => {}) },
  };

  const fetchMock = vi.fn();

  const run = new Function("self", "caches", "fetch", "URL", src);
  run(self, caches, fetchMock, URL);

  return { listeners, stores, self, fetchMock };
}

function fetchEvent(url: string, over: Record<string, unknown> = {}) {
  let responded: unknown;
  const event = {
    request: { method: "GET", mode: "navigate", url, ...over },
    respondWith: (p: unknown) => {
      responded = p;
    },
  };
  return { event, result: () => responded };
}

// The store runs in a promise chain the handler does not await, so an
// assertion has to come after those microtasks. Draining a fixed number of
// ticks is deterministic and, unlike counting them exactly, does not pin the
// test to the handler's internal shape.
async function flush() {
  for (let i = 0; i < 5; i++) await Promise.resolve();
}

describe("service worker", () => {
  it("registers every listener the app relies on", () => {
    const { listeners } = loadWorker();
    expect(Object.keys(listeners).sort()).toEqual([
      "activate",
      "fetch",
      "install",
      "notificationclick",
      "push",
    ]);
  });

  it("ignores a non-GET request entirely", () => {
    const { listeners } = loadWorker();
    const { event, result } = fetchEvent(`${ORIGIN}/api/anything`, {
      method: "POST",
    });
    listeners.fetch(event);
    expect(result()).toBeUndefined();
  });

  it("falls back to the shell when an offline navigation is not cached", async () => {
    const { listeners, fetchMock } = loadWorker({
      [CACHE_NAME]: [`${ORIGIN}/`, `${ORIGIN}/manifest.webmanifest`],
    });
    fetchMock.mockRejectedValue(new Error("offline"));
    const { event, result } = fetchEvent(`${ORIGIN}/log/abc`);
    listeners.fetch(event);
    await expect(result()).resolves.toBe(`body:${ORIGIN}/`);
  });

  // The behaviour this whole change exists to produce. It passes today only
  // when the page was somehow already cached, which in practice never happens.
  // It also pins the ordering of the two /log/ branches: the network-first one
  // below sends session pages straight out, so were it to sit above this, an
  // offline navigation would fail instead of rendering from the cache.
  it("serves a cached page for an offline navigation when one exists", async () => {
    const { listeners, fetchMock } = loadWorker({
      [CACHE_NAME]: [`${ORIGIN}/`, `${ORIGIN}/log/abc`],
    });
    fetchMock.mockRejectedValue(new Error("offline"));
    const { event, result } = fetchEvent(`${ORIGIN}/log/abc`);
    listeners.fetch(event);
    await expect(result()).resolves.toBe(`body:${ORIGIN}/log/abc`);
  });

  // The client warms this cache with a plain fetch, which is a GET with mode
  // "cors" rather than "navigate", so it lands in the generic fallback. Cache
  // first there served the warm the entry it had written itself: it never
  // reached the network, re-stored an identical body, and the cached page
  // stayed frozen at the session's first mount.
  it("sends a non-navigate request for a session page to the network", async () => {
    const { listeners, fetchMock } = loadWorker({
      [CACHE_NAME]: [`${ORIGIN}/log/abc`],
    });
    fetchMock.mockResolvedValue("fresh");
    const { event, result } = fetchEvent(`${ORIGIN}/log/abc`, { mode: "cors" });
    listeners.fetch(event);
    await expect(result()).resolves.toBe("fresh");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  // Everything else keeps the cache-first fallback it has always had.
  it("still answers other non-navigate requests from the cache", async () => {
    const { listeners, fetchMock } = loadWorker({
      [CACHE_NAME]: [`${ORIGIN}/manifest.webmanifest`],
    });
    const { event, result } = fetchEvent(`${ORIGIN}/manifest.webmanifest`, {
      mode: "cors",
    });
    listeners.fetch(event);
    await expect(result()).resolves.toBe(`body:${ORIGIN}/manifest.webmanifest`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("serves a static asset from the cache without hitting the network", async () => {
    const { listeners, fetchMock } = loadWorker({
      [CACHE_NAME]: [`${ORIGIN}/_next/static/chunks/main.abc.js`],
    });
    const { event, result } = fetchEvent(`${ORIGIN}/_next/static/chunks/main.abc.js`, {
      mode: "no-cors",
    });
    listeners.fetch(event);
    await expect(result()).resolves.toBe(`body:${ORIGIN}/_next/static/chunks/main.abc.js`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stores a static asset the first time it is fetched", async () => {
    const { listeners, fetchMock, stores } = loadWorker({ [CACHE_NAME]: [] });
    fetchMock.mockResolvedValue({ ok: true, clone: () => "cloned" });
    const { event, result } = fetchEvent(`${ORIGIN}/_next/static/chunks/new.def.js`, {
      mode: "no-cors",
    });
    listeners.fetch(event);
    await result();
    await Promise.resolve();
    expect([...stores.get(CACHE_NAME)!.keys()]).toContain(
      `${ORIGIN}/_next/static/chunks/new.def.js`,
    );
  });

  // The static branch is cache first and never revalidates, and the cache is
  // only pruned when this worker's own bytes change, so a non-200 stored under
  // a chunk URL would be served in place of the real asset for as long as the
  // worker stands. The ok guard is what stops that.
  it("does not store a static asset the server did not serve", async () => {
    const { listeners, fetchMock, stores } = loadWorker({ [CACHE_NAME]: [] });
    fetchMock.mockResolvedValue({ ok: false, clone: () => "cloned" });
    const { event, result } = fetchEvent(`${ORIGIN}/_next/static/chunks/bad.ghi.js`, {
      mode: "no-cors",
    });
    listeners.fetch(event);
    await result();
    await Promise.resolve();
    expect([...stores.get(CACHE_NAME)!.keys()]).toEqual([]);
  });

  // Growth has to be bounded by construction, not by remembering to bump a
  // constant. Every deploy mints new hashed filenames and nothing else removes
  // the old ones.
  it("prunes stale static assets on activate but keeps the shell", async () => {
    const { listeners, stores } = loadWorker({
      [CACHE_NAME]: [
        `${ORIGIN}/`,
        `${ORIGIN}/manifest.webmanifest`,
        `${ORIGIN}/_next/static/chunks/old.111.js`,
        `${ORIGIN}/log/abc`,
      ],
    });
    let waited: unknown;
    listeners.activate({ waitUntil: (p: unknown) => (waited = p) });
    await waited;
    const left = [...stores.get(CACHE_NAME)!.keys()].sort();
    expect(left).toEqual([`${ORIGIN}/`, `${ORIGIN}/log/abc`, `${ORIGIN}/manifest.webmanifest`]);
  });

  it("deletes caches from older versions on activate", async () => {
    const { listeners, stores } = loadWorker({
      "onyx-shell-v3": [`${ORIGIN}/`],
      [CACHE_NAME]: [`${ORIGIN}/`],
    });
    let waited: unknown;
    listeners.activate({ waitUntil: (p: unknown) => (waited = p) });
    await waited;
    expect([...stores.keys()]).toEqual([CACHE_NAME]);
  });

  // install writes the shell once and nothing replaced it, so a worker
  // installed before a deploy served that build's document for its whole
  // life. On 2026-08-12 that meant an installed app running a client bundle
  // with a deactivated Supabase key inlined into it.
  it("refreshes the shell on a successful navigation", async () => {
    const { listeners, fetchMock, stores } = loadWorker({ [CACHE_NAME]: [] });
    fetchMock.mockResolvedValue({
      ok: true,
      type: "basic",
      redirected: false,
      clone: () => "fresh-shell",
    });
    const { event, result } = fetchEvent(`${ORIGIN}/`);
    listeners.fetch(event);
    await result();
    await flush();
    expect(stores.get(CACHE_NAME)!.get(`${ORIGIN}/`)).toBe("fresh-shell");
  });

  // A signed out visitor is sent to /sign-in by the proxy, and the worker's
  // fetch follows that, so the response arrives ok and basic while carrying
  // the wrong page. Stored under / it would be replayed as the app shell.
  it("does not store a shell navigation that was redirected", async () => {
    const { listeners, fetchMock, stores } = loadWorker({ [CACHE_NAME]: [] });
    fetchMock.mockResolvedValue({
      ok: true,
      type: "basic",
      redirected: true,
      clone: () => "sign-in-page",
    });
    const { event, result } = fetchEvent(`${ORIGIN}/`);
    listeners.fetch(event);
    await result();
    await flush();
    expect([...stores.get(CACHE_NAME)!.keys()]).toEqual([]);
  });

  // The same hole, and it ships today: an expired session navigating to a
  // workout URL would cache the sign-in page under that workout's key.
  it("does not store a session navigation that was redirected", async () => {
    const { listeners, fetchMock, stores } = loadWorker({ [CACHE_NAME]: [] });
    fetchMock.mockResolvedValue({
      ok: true,
      type: "basic",
      redirected: true,
      clone: () => "sign-in-page",
    });
    const { event, result } = fetchEvent(`${ORIGIN}/log/abc`);
    listeners.fetch(event);
    await result();
    await flush();
    expect([...stores.get(CACHE_NAME)!.keys()]).toEqual([]);
  });

  // public/sw.js cannot import from src/, so the cache name lives in two
  // places. This is the only thing stopping them drifting apart silently.
  it("uses the same cache name the client warms into", () => {
    const src = readFileSync("public/sw.js", "utf8");
    expect(src).toContain(`const CACHE = "${PAGE_CACHE}"`);
  });

  // sw.js cannot import appName either, so the title fallback is a literal
  // that has to be checked against the app's own name. A push with no title,
  // or one whose payload fails JSON.parse, falls back to this string, and a
  // test push from the devtools Application panel carries exactly that, so
  // this is reachable in practice, not just in theory.
  it("falls back to the app name when a push arrives with no title", () => {
    const src = readFileSync("public/sw.js", "utf8");
    expect(src).toContain(`const title = data.title || "${appName}"`);
  });
});
