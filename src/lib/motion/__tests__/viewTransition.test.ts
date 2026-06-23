import { describe, it, expect, vi, afterEach } from "vitest";
import { runViewTransition } from "@/lib/motion/viewTransition";

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe("runViewTransition", () => {
  it("runs the update directly when startViewTransition is unavailable", () => {
    // jsdom has no startViewTransition by default
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q }));
    const update = vi.fn();
    runViewTransition(update);
    expect(update).toHaveBeenCalledOnce();
  });

  it("uses startViewTransition when available and motion is allowed", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q }));
    const svt = vi.fn((cb: () => void) => { cb(); return { finished: Promise.resolve() }; });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = svt;
    const update = vi.fn();
    runViewTransition(update);
    expect(svt).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledOnce();
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it("swallows a rejected finished promise (interrupted transition)", async () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q }));
    const rejected = Promise.reject(new Error("transition interrupted"));
    const svt = vi.fn((cb: () => void) => { cb(); return { finished: rejected }; });
    (document as unknown as { startViewTransition: unknown }).startViewTransition = svt;
    const update = vi.fn();
    expect(() => runViewTransition(update)).not.toThrow();
    expect(update).toHaveBeenCalledOnce();
    // Let the microtask queue drain; the guard's .catch must absorb the rejection.
    await Promise.resolve();
    await rejected.catch(() => {});
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });

  it("skips startViewTransition and runs update directly under reduced motion", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: true, media: q }));
    const svt = vi.fn();
    (document as unknown as { startViewTransition: unknown }).startViewTransition = svt;
    const update = vi.fn();
    runViewTransition(update);
    expect(svt).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledOnce();
    delete (document as unknown as { startViewTransition?: unknown }).startViewTransition;
  });
});
