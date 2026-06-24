import { describe, it, expect } from "vitest";
import { markSvg, MARK_VIEWBOX, MARK_INNER } from "../mark";

describe("markSvg", () => {
  it("exposes a 120x140 viewBox", () => {
    expect(MARK_VIEWBOX).toBe("0 0 120 140");
  });

  it("lit variant carries the cobalt accent and a gradient", () => {
    const svg = markSvg({ variant: "lit" });
    expect(svg).toContain("<svg");
    expect(svg).toContain(`viewBox="${MARK_VIEWBOX}"`);
    expect(svg).toContain("linearGradient");
    expect(svg).toContain("#3b82f6");
    expect(svg).toContain("#7aa9f9");
  });

  it("mono variant uses currentColor and no hardcoded cobalt", () => {
    const svg = markSvg({ variant: "mono" });
    expect(svg).toContain("currentColor");
    expect(svg).not.toContain("#3b82f6");
  });

  it("defaults to the lit variant", () => {
    expect(markSvg()).toBe(markSvg({ variant: "lit" }));
  });

  it("draws six facets in both variants", () => {
    const litFacets = (markSvg({ variant: "lit" }).match(/<path /g) || []).length;
    const monoFacets = (markSvg({ variant: "mono" }).match(/<path /g) || []).length;
    expect(litFacets).toBe(6);
    expect(monoFacets).toBe(6);
  });

  it("MARK_INNER is the wrapper-less markup", () => {
    expect(MARK_INNER).not.toContain("<svg");
    expect(MARK_INNER).toContain("<path");
  });
});
