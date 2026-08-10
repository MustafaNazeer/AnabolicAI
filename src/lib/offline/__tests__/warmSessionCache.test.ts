// src/lib/offline/__tests__/warmSessionCache.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { warmSessionCache } from "@/lib/offline/warmSessionCache";

const put = vi.fn();
const originalFetch = globalThis.fetch;

function setup(over: { online?: boolean; controlled?: boolean } = {}) {
  put.mockReset();
  vi.stubGlobal("caches", { open: vi.fn(async () => ({ put })) });
  vi.stubGlobal("navigator", {
    onLine: over.online ?? true,
    serviceWorker: { controller: (over.controlled ?? true) ? {} : null },
  });
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
    expect(put).toHaveBeenCalledTimes(1);
  });

  it("does nothing while offline", async () => {
    setup({ online: false });
    await warmSessionCache("/log/abc");
    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
  });

  it("does nothing when no service worker controls the page", async () => {
    setup({ controlled: false });
    await warmSessionCache("/log/abc");
    expect(put).not.toHaveBeenCalled();
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
