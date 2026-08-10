// src/lib/offline/__tests__/serviceWorker.test.ts
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { PAGE_CACHE } from "@/lib/offline/warmSessionCache";

type Handler = (event: unknown) => void;

const ORIGIN = "http://x";

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
      "onyx-shell-v4": [`${ORIGIN}/`, `${ORIGIN}/manifest.webmanifest`],
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
      "onyx-shell-v4": [`${ORIGIN}/`, `${ORIGIN}/log/abc`],
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
      "onyx-shell-v4": [`${ORIGIN}/log/abc`],
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
      "onyx-shell-v4": [`${ORIGIN}/manifest.webmanifest`],
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
      "onyx-shell-v4": [`${ORIGIN}/_next/static/chunks/main.abc.js`],
    });
    const { event, result } = fetchEvent(`${ORIGIN}/_next/static/chunks/main.abc.js`, {
      mode: "no-cors",
    });
    listeners.fetch(event);
    await expect(result()).resolves.toBe(`body:${ORIGIN}/_next/static/chunks/main.abc.js`);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("stores a static asset the first time it is fetched", async () => {
    const { listeners, fetchMock, stores } = loadWorker({ "onyx-shell-v4": [] });
    fetchMock.mockResolvedValue({ ok: true, clone: () => "cloned" });
    const { event, result } = fetchEvent(`${ORIGIN}/_next/static/chunks/new.def.js`, {
      mode: "no-cors",
    });
    listeners.fetch(event);
    await result();
    await Promise.resolve();
    expect([...stores.get("onyx-shell-v4")!.keys()]).toContain(
      `${ORIGIN}/_next/static/chunks/new.def.js`,
    );
  });

  // Growth has to be bounded by construction, not by remembering to bump a
  // constant. Every deploy mints new hashed filenames and nothing else removes
  // the old ones.
  it("prunes stale static assets on activate but keeps the shell", async () => {
    const { listeners, stores } = loadWorker({
      "onyx-shell-v4": [
        `${ORIGIN}/`,
        `${ORIGIN}/manifest.webmanifest`,
        `${ORIGIN}/_next/static/chunks/old.111.js`,
        `${ORIGIN}/log/abc`,
      ],
    });
    let waited: unknown;
    listeners.activate({ waitUntil: (p: unknown) => (waited = p) });
    await waited;
    const left = [...stores.get("onyx-shell-v4")!.keys()].sort();
    expect(left).toEqual([`${ORIGIN}/`, `${ORIGIN}/log/abc`, `${ORIGIN}/manifest.webmanifest`]);
  });

  it("deletes caches from older versions on activate", async () => {
    const { listeners, stores } = loadWorker({
      "onyx-shell-v3": [`${ORIGIN}/`],
      "onyx-shell-v4": [`${ORIGIN}/`],
    });
    let waited: unknown;
    listeners.activate({ waitUntil: (p: unknown) => (waited = p) });
    await waited;
    expect([...stores.keys()]).toEqual(["onyx-shell-v4"]);
  });

  // public/sw.js cannot import from src/, so the cache name lives in two
  // places. This is the only thing stopping them drifting apart silently.
  it("uses the same cache name the client warms into", () => {
    const src = readFileSync("public/sw.js", "utf8");
    expect(src).toContain(`const CACHE = "${PAGE_CACHE}"`);
  });
});
