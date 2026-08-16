import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { THEME_ASSETS, appleIconFile, appleIconHref } from "../themeAssets";
import { THEMES } from "@/lib/theme";

const css = readFileSync("src/app/globals.css", "utf8");

// String slicing, not a RegExp built from the arguments: semgrep's
// detect-non-literal-regexp rule runs in CI only and blocks the dynamic form.
function darkBlock(theme: string): string {
  const selector = `[data-mode="dark"][data-theme="${theme}"]`;
  const at = css.indexOf(selector);
  if (at === -1) throw new Error(`no dark block for ${theme} in globals.css`);
  const open = css.indexOf("{", at);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}
function decl(body: string, prop: string): string {
  const key = `--${prop}:`;
  const line = body
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith(key));
  if (!line) throw new Error(`no --${prop} in block`);
  return line.slice(key.length).trim();
}

describe("per theme asset colours", () => {
  it("covers every theme, with none left over", () => {
    expect(Object.keys(THEME_ASSETS).sort()).toEqual([...THEMES].sort());
  });

  // The generator bakes these into PNGs, which cannot follow a CSS variable.
  // Nothing else ties the baked values to the stylesheet, so without this test
  // a theme's colours could be changed in globals.css and the generated icon
  // would keep shipping the old ones, exactly as the mark did with cobalt.
  it("matches each theme's own accent in globals.css", () => {
    for (const theme of THEMES) {
      expect(THEME_ASSETS[theme].accent, `${theme} accent drifted`).toBe(
        decl(darkBlock(theme), "accent"),
      );
    }
  });

  it("matches both ends of each theme's own dark background gradient", () => {
    for (const theme of THEMES) {
      const stops = decl(darkBlock(theme), "bg-gradient").match(/#[0-9a-f]{6}/gi);
      expect(stops, `${theme} gradient has no hex stops`).toHaveLength(2);
      expect(THEME_ASSETS[theme].baseTop, `${theme} baseTop drifted`).toBe(stops![0]);
      expect(THEME_ASSETS[theme].baseBot, `${theme} baseBot drifted`).toBe(stops![1]);
    }
  });
});

describe("apple touch icon naming", () => {
  // iOS reads <link rel="apple-touch-icon"> for the home screen icon, and the
  // proxy matcher excludes public/ files BY FILENAME SHAPE. A name that stops
  // matching gets redirected to /sign-in for a signed out visitor, which is how
  // the favicon broke once before. proxy.test asserts the matcher covers this.
  it("names every file in the shape the proxy matcher excludes", () => {
    for (const theme of THEMES) {
      expect(appleIconFile(theme)).toMatch(/^apple-icon-[a-z]+\.png$/);
      expect(appleIconHref(theme)).toBe(`/icons/${appleIconFile(theme)}`);
    }
  });

  it("gives every theme a distinct file", () => {
    const files = THEMES.map(appleIconFile);
    expect(new Set(files).size).toBe(THEMES.length);
  });
});
