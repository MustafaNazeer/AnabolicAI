import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(resolve(__dirname, "../../app/globals.css"), "utf8");

function block(selector: string): string {
  const re = new RegExp(`${selector.replace(/[[\]"=]/g, "\\$&")}\\s*\\{([^}]*)\\}`);
  const m = css.match(re);
  if (!m) throw new Error(`block not found: ${selector}`);
  return m[1];
}

function pick(body: string, name: string): string | null {
  const m = body.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

function firstHex(value: string): string {
  const m = value.match(/#([0-9a-fA-F]{6})/);
  if (!m) throw new Error(`no hex in: ${value}`);
  return `#${m[1]}`;
}

const root = block(":root");
const ON_ACCENT = pick(root, "on-accent")!;

type Resolved = { text: string; textDim: string; accent: string; baseTop: string };

function theme(selector: string | null): Resolved {
  const body = selector ? block(selector) : root;
  return {
    text: pick(body, "text") ?? pick(root, "text")!,
    textDim: pick(body, "text-dim") ?? pick(root, "text-dim")!,
    accent: pick(body, "accent") ?? pick(root, "accent")!,
    baseTop: firstHex(pick(body, "bg-gradient") ?? pick(root, "bg-gradient")!),
  };
}

const THEMES: Record<string, Resolved> = {
  cobalt: theme(null),
  emerald: theme('[data-theme="emerald"]'),
  magenta: theme('[data-theme="magenta"]'),
  crimson: theme('[data-theme="crimson"]'),
  rose: theme('[data-theme="rose"]'),
};

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

// Composite an rgba foreground (the frosted surface) over an opaque hex base.
function over(fg: [number, number, number, number], bg: string): string {
  const b = rgb(bg);
  const a = fg[3];
  const out = [0, 1, 2].map((i) => Math.round(fg[i] * a + b[i] * (1 - a)));
  return `#${out.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

function luminance(hex: string): number {
  const lin = rgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

function ratio(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

// Worst realistic background for text: a frosted card (white 5%) over the lightest base.
const SURFACE: [number, number, number, number] = [255, 255, 255, 0.05];

describe("WCAG AA contrast across all themes", () => {
  for (const [name, t] of Object.entries(THEMES)) {
    const cardBg = over(SURFACE, t.baseTop);
    it(`${name}: body text on frosted card >= 4.5:1`, () => {
      expect(ratio(t.text, cardBg)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: dim text on frosted card >= 4.5:1`, () => {
      expect(ratio(t.textDim, cardBg)).toBeGreaterThanOrEqual(4.5);
    });
    it(`${name}: on-accent text on accent >= 4.5:1`, () => {
      expect(ratio(ON_ACCENT, t.accent)).toBeGreaterThanOrEqual(4.5);
    });
  }
});
