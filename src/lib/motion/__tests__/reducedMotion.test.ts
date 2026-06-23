import { describe, it, expect, vi, afterEach } from "vitest";
import { prefersReducedMotion } from "@/lib/motion/reducedMotion";

afterEach(() => { vi.unstubAllGlobals(); });

describe("prefersReducedMotion", () => {
  it("returns true when the media query matches", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: true, media: q }));
    expect(prefersReducedMotion()).toBe(true);
  });

  it("returns false when it does not match", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({ matches: false, media: q }));
    expect(prefersReducedMotion()).toBe(false);
  });

  it("returns false when matchMedia is unavailable (SSR)", () => {
    vi.stubGlobal("matchMedia", undefined);
    expect(prefersReducedMotion()).toBe(false);
  });
});
