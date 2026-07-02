// Colorblind-aware categorical hues that read on the dark themed base
// (--bg roughly #070a10 to #111a2c). Derived from the Okabe-Ito palette,
// then re-tuned in OKLCH for a dark surface: lightness compressed into the
// dark-mode band (L 0.48-0.67), chroma raised to clear the "reads as gray"
// floor, and the slot order chosen to maximize adjacent-pair separation
// under simulated deuteranopia/protanopia.
export const CHART_PALETTE: string[] = [
  "#258e6b", // bluish green
  "#7b65d1", // indigo
  "#9e7120", // amber orange
  "#ba4c8e", // reddish purple
  "#bc5a1f", // vermillion
  "#2383b4", // sky blue
  "#847d20", // olive yellow
  "#1b9994", // teal
];

export function colorForIndex(i: number): string {
  return CHART_PALETTE[i % CHART_PALETTE.length];
}
