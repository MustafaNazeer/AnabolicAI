// Onyx mark: an upright faceted cut-stone. Six facets, symmetric about x=60.
// Outline vertices: A(44,36) B(76,36) C(92,58) D(78,92) E(60,118) F(42,92) G(28,58).
// Center spine: Tc(60,36) C2(60,58) Mc(60,88) to point E(60,118). Light from upper-left.

export const MARK_VIEWBOX = "0 0 120 140";

type Variant = "lit" | "mono";

// Facet polygons, drawn back-to-front. Order matters only for the rim overlay.
const FACETS = [
  // id, points, litFill, monoOpacity
  ["crownL", "44,36 60,36 60,58 28,58", "url(#onyxLit)", 0.95], // top-left crown, brightest
  ["crownR", "60,36 76,36 92,58 60,58", "#16243a", 0.55],       // top-right crown, mid dark
  ["pavLU", "28,58 60,58 60,88 42,92", "url(#onyxMid)", 0.7],   // pavilion left upper, secondary lit
  ["pavRU", "60,58 92,58 78,92 60,88", "#0a0e16", 0.4],         // pavilion right upper, darkest
  ["pavLL", "42,92 60,88 60,118", "#101a2c", 0.5],              // pavilion left lower
  ["pavRL", "60,88 78,92 60,118", "#0c1320", 0.35],             // pavilion right lower
] as const;

function facetPaths(variant: Variant): string {
  return FACETS.map(([id, points, litFill, monoOpacity]) => {
    const fill = variant === "lit" ? litFill : "currentColor";
    const opacity = variant === "lit" ? "" : ` opacity="${monoOpacity}"`;
    // points -> path "M x,y L ... Z"
    const pts = points.split(" ");
    const d = `M${pts[0]} ${pts.slice(1).map((p) => `L${p}`).join(" ")} Z`;
    return `<path data-facet="${id}" d="${d}" fill="${fill}"${opacity} />`;
  }).join("");
}

function defs(): string {
  return (
    `<defs>` +
    `<linearGradient id="onyxLit" x1="44" y1="36" x2="28" y2="58" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#7aa9f9"/><stop offset="1" stop-color="#3b82f6"/>` +
    `</linearGradient>` +
    `<linearGradient id="onyxMid" x1="28" y1="58" x2="60" y2="92" gradientUnits="userSpaceOnUse">` +
    `<stop offset="0" stop-color="#2c5aa0"/><stop offset="1" stop-color="#16243a"/>` +
    `</linearGradient>` +
    `</defs>`
  );
}

// Hairline rim on the lit (left) outline edge A->G->F.
function rim(variant: Variant): string {
  const stroke = variant === "lit" ? "#7aa9f9" : "currentColor";
  const opacity = variant === "lit" ? "0.9" : "0.8";
  return `<polyline points="44,36 28,58 42,92" fill="none" stroke="${stroke}" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round" opacity="${opacity}" />`;
}

export const MARK_INNER = `${defs()}<g>${facetPaths("lit")}</g>${rim("lit")}`;

export function markSvg(opts: { variant?: Variant } = {}): string {
  const variant = opts.variant ?? "lit";
  const inner = `${variant === "lit" ? defs() : ""}<g>${facetPaths(variant)}</g>${rim(variant)}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" fill="none">${inner}</svg>`;
}
