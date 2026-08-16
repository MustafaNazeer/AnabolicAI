// AnabolicAI mark: a loaded dumbbell in flat, hard-cornered geometry.
// Four plates and a bar, symmetric about x=60 on a square viewBox.
//
// Two properties carry the whole design, and both are pinned by mark.test.ts:
//
// 1. EVERY PLATE TAPERS, shorter at its outer edge and taller at its inner one.
//    That slant is the only reason it reads as faceted rather than as flat
//    slabs. Flatten it and this becomes a duller, more generic mark.
//
// 2. DEPTH IS OPACITY, NEVER A SECOND COLOUR. The falloff left to right is the
//    light. Because it is opacity against whatever sits behind, one mark works
//    for all five accents in both light and dark with no per-theme table. The
//    mark this replaced hardcoded cobalt and stayed blue after crimson became
//    the default accent, which is the bug that shape is designed out of.

export const MARK_VIEWBOX = "0 0 120 120";

type Variant = "lit" | "mono";

// id, path, opacity. Drawn left to right; the opacity ladder is the lighting.
const PARTS = [
  ["outerL", "M4,46 L18,40 L18,80 L4,74 Z", 1],
  ["innerL", "M22,26 L46,20 L46,100 L22,94 Z", 1],
  ["bar", "M46,54 L74,54 L74,66 L46,66 Z", 0.7],
  ["innerR", "M74,20 L98,26 L98,94 L74,100 Z", 0.6],
  ["outerR", "M102,40 L116,46 L116,74 L102,80 Z", 0.45],
] as const;

function parts(variant: Variant, color?: string): string {
  // "lit" follows the user's accent live. A caller may bake a literal instead,
  // which the asset generator must do because a PNG cannot carry a CSS
  // custom property.
  const fill = variant === "mono" ? "currentColor" : (color ?? "var(--accent)");
  return PARTS.map(
    ([id, d, opacity]) =>
      `<path data-part="${id}" d="${d}" fill="${fill}" opacity="${opacity}" />`,
  ).join("");
}

export const MARK_INNER = parts("lit");

export function markSvg(
  opts: { variant?: Variant; color?: string } = {},
): string {
  const inner = parts(opts.variant ?? "lit", opts.color);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" fill="none">${inner}</svg>`;
}
