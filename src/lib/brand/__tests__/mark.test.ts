import { describe, it, expect } from "vitest";
import { markSvg, MARK_VIEWBOX, MARK_INNER } from "../mark";

// Pulls the y coordinates of one part's path out of the rendered markup, so a
// test can assert the SHAPE rather than just that a string is present.
function partYs(svg: string, part: string): number[] {
  const m = svg.match(new RegExp(`data-part="${part}" d="([^"]+)"`));
  if (!m) throw new Error(`no part named ${part} in the mark`);
  return [...m[1].matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((p) => Number(p[2]));
}
const span = (ys: number[]) => Math.max(...ys) - Math.min(...ys);

describe("markSvg", () => {
  it("exposes a square viewBox", () => {
    expect(MARK_VIEWBOX).toBe("0 0 120 120");
  });

  it("lit variant follows the theme accent and bakes no colour of its own", () => {
    const svg = markSvg({ variant: "lit" });
    expect(svg).toContain("<svg");
    expect(svg).toContain(`viewBox="${MARK_VIEWBOX}"`);
    expect(svg).toContain("var(--accent)");
    // A hardcoded hex here is the bug this replaced: the old mark was pinned to
    // cobalt and stayed blue after crimson became the default accent.
    expect(svg).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it("mono variant uses currentColor and never the accent variable", () => {
    const svg = markSvg({ variant: "mono" });
    expect(svg).toContain("currentColor");
    expect(svg).not.toContain("var(--accent)");
  });

  it("bakes a literal colour when one is given, for the asset generator", () => {
    // PNGs cannot carry a CSS custom property, so the icon and splash generator
    // needs a real value. Without this the generated assets render unfilled.
    const svg = markSvg({ variant: "lit", color: "#ef4444" });
    expect(svg).toContain("#ef4444");
    expect(svg).not.toContain("var(--accent)");
  });

  it("defaults to the lit variant", () => {
    expect(markSvg()).toBe(markSvg({ variant: "lit" }));
  });

  it("draws four plates and one bar in both variants", () => {
    for (const variant of ["lit", "mono"] as const) {
      const svg = markSvg({ variant });
      expect((svg.match(/<path /g) || []).length).toBe(5);
      expect(svg).toContain('data-part="bar"');
      for (const p of ["outerL", "innerL", "innerR", "outerR"]) {
        expect(svg, `${variant} is missing ${p}`).toContain(`data-part="${p}"`);
      }
    }
  });

  // The whole reason this mark reads as faceted rather than as flat slabs is
  // that every plate TAPERS: shorter at its outer edge, taller at its inner
  // one. Flatten that and it becomes a different, duller mark, so it is pinned.
  it("tapers every plate, shorter outboard and taller inboard", () => {
    const svg = markSvg();
    for (const [part, outerX] of [["outerL", 4], ["innerL", 22], ["innerR", 98], ["outerR", 116]] as const) {
      const m = svg.match(new RegExp(`data-part="${part}" d="([^"]+)"`))!;
      const pts = [...m[1].matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((p) => [Number(p[1]), Number(p[2])]);
      const outer = pts.filter(([x]) => x === outerX).map(([, y]) => y);
      const inner = pts.filter(([x]) => x !== outerX).map(([, y]) => y);
      expect(outer.length, `${part} has no edge at x=${outerX}`).toBe(2);
      expect(span(outer), `${part} does not taper`).toBeLessThan(span(inner));
    }
  });

  it("keeps the inner plates taller than the outer ones", () => {
    const svg = markSvg();
    expect(span(partYs(svg, "innerL"))).toBeGreaterThan(span(partYs(svg, "outerL")));
    expect(span(partYs(svg, "innerR"))).toBeGreaterThan(span(partYs(svg, "outerR")));
  });

  it("fills the width of the viewBox, so the icon generator has no dead margin", () => {
    const svg = markSvg();
    const xs = [...svg.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)].map((p) => Number(p[1]));
    expect(Math.min(...xs)).toBeLessThanOrEqual(6);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(114);
  });

  it("MARK_INNER is the wrapper-less markup", () => {
    expect(MARK_INNER).not.toContain("<svg");
    expect(MARK_INNER).toContain("<path");
  });
});
