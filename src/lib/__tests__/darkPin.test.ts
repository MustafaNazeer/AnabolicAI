import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

const css = readFileSync(resolve(__dirname, "../../app/globals.css"), "utf8");

function block(selector: string): string {
  // Every selector is a literal written in this file, so no untrusted input reaches the pattern.
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  const re = new RegExp(
    `${selector.replace(/[[\]"=]/g, "\\$&")}\\s*\\{([^}]*)\\}`,
  );
  const m = css.match(re);
  if (!m) throw new Error(`block not found: ${selector}`);
  return m[1];
}
function pick(body: string, name: string): string | null {
  // Every name is a literal written in this file, so no untrusted input reaches the pattern.
  // nosemgrep: javascript.lang.security.audit.detect-non-literal-regexp.detect-non-literal-regexp
  const m = body.match(new RegExp(`--${name}:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
}

const INVARIANT = { "on-accent": "#0a0b0c" };
const SHARED_DARK = {
  surface: "rgba(255, 255, 255, 0.05)",
  "surface-sunken": "rgba(0, 0, 0, 0.25)",
  "surface-border": "rgba(255, 255, 255, 0.10)",
};
const DARK: Record<string, Record<string, string>> = {
  cobalt: {
    accent: "#3b82f6",
    "accent-dim": "#1e2f4d",
    "bg-gradient":
      "radial-gradient(120% 90% at 50% 0%, #111a2c 0%, #070a10 62%)",
    text: "#e8eef7",
    "text-dim": "#93a0b3",
  },
  emerald: {
    accent: "#34d399",
    "accent-dim": "#123026",
    "bg-gradient":
      "radial-gradient(120% 90% at 50% 0%, #18271f 0%, #070c09 62%)",
    text: "#e7efeb",
    "text-dim": "#889a92",
  },
  magenta: {
    accent: "#f0457e",
    "accent-dim": "#3a1622",
    "bg-gradient":
      "radial-gradient(120% 90% at 50% 0%, #2a1320 0%, #0c060a 62%)",
    text: "#f3e6ee",
    "text-dim": "#ad94a2",
  },
  crimson: {
    accent: "#ef4444",
    "accent-dim": "#3a1a1a",
    "bg-gradient":
      "radial-gradient(120% 90% at 50% 0%, #251114 0%, #0a0708 62%)",
    text: "#f3e9ea",
    "text-dim": "#a8908f",
  },
  rose: {
    accent: "#fb7185",
    "accent-dim": "#3a1c22",
    "bg-gradient":
      "radial-gradient(120% 90% at 50% 0%, #241318 0%, #0b0709 62%)",
    text: "#f4e9ec",
    "text-dim": "#a8929a",
  },
};

describe("dark tokens pinned to shipped v1 values", () => {
  const root = block(":root");
  for (const [k, v] of Object.entries(INVARIANT)) {
    it(`invariant --${k}`, () => expect(pick(root, k)).toBe(v));
  }
  const shared = block('[data-mode="dark"]');
  for (const [k, v] of Object.entries(SHARED_DARK)) {
    it(`shared dark --${k}`, () => expect(pick(shared, k)).toBe(v));
  }
  for (const [name, tokens] of Object.entries(DARK)) {
    const body = block(`[data-mode="dark"][data-theme="${name}"]`);
    for (const [k, v] of Object.entries(tokens)) {
      it(`${name} dark --${k}`, () => expect(pick(body, k)).toBe(v));
    }
  }
});
