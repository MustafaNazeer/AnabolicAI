import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { CHROME_COLOR } from "../chrome";
import { DEFAULT_THEME } from "../theme";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
const css = readFileSync("src/app/globals.css", "utf8");

// Pulls one custom property out of a specific mode+theme block in globals.css,
// so these tests compare against the real stylesheet rather than a copy of it.
function token(mode: string, theme: string, prop: string): string {
  const block = css.match(
    new RegExp(`\\[data-mode="${mode}"\\]\\[data-theme="${theme}"\\]\\s*\\{([^}]*)\\}`),
  );
  if (!block) throw new Error(`no ${mode}/${theme} block in globals.css`);
  const m = block[1].match(new RegExp(`--${prop}:\\s*([^;]+);`));
  if (!m) throw new Error(`no --${prop} in the ${mode}/${theme} block`);
  return m[1].trim();
}

describe("browser chrome colour", () => {
  // The bug this guards: these values lived in the manifest, the root layout
  // and AppearanceProvider at once, with nothing tying them to the stylesheet.
  // When crimson replaced cobalt as the default accent all three were left on
  // cobalt's bases, so the status bar disagreed with the app behind it.
  it("matches the default theme's own base gradient, at both ends", () => {
    for (const [mode, expected] of [
      ["dark", CHROME_COLOR.dark],
      ["light", CHROME_COLOR.light],
    ] as const) {
      const gradient = token(mode, DEFAULT_THEME, "bg-gradient");
      expect(
        gradient,
        `chrome ${mode} is ${expected}, which is not in ${DEFAULT_THEME}'s ${mode} gradient`,
      ).toContain(expected);
    }
  });

  it("is what the web manifest ships", () => {
    expect(manifest.theme_color).toBe(CHROME_COLOR.dark);
    expect(manifest.background_color).toBe(CHROME_COLOR.dark);
  });

  it("is what the root layout declares for each colour scheme", () => {
    // The viewport export is a module-level literal, so reading the source is
    // the only way to check it without booting Next.
    const layout = readFileSync("src/app/layout.tsx", "utf8");
    const block = layout.match(/themeColor:\s*\[([\s\S]*?)\]/);
    expect(block, "no themeColor array in the root layout").not.toBeNull();
    expect(block![1]).toContain("CHROME_COLOR.light");
    expect(block![1]).toContain("CHROME_COLOR.dark");
  });
});
