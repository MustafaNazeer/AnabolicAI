import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  THEME_ASSETS,
  appleIconFile,
  appleIconHref,
  SPLASH_THEMES,
  splashThemeFor,
} from "../themeAssets";
import { THEMES, DEFAULT_THEME } from "@/lib/theme";

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

// A splash set costs 11 PNGs per accent, against 1 for an icon, so the accents
// that have one are tracked separately from the accents the app offers. Today
// that is deliberately a subset: the launch splash is being proved on a device
// before the remaining accents are paid for.
//
// The invariant that matters is that the app can never point a startup image at
// an accent with no file behind it. Such a href would 404 into the app's own
// error page, a real HTML document rendered with no policy, which is the exact
// defect the proxy matcher comment warns about twice.
describe("splash accent coverage", () => {
  it("is a non empty subset of the accents the app offers", () => {
    expect(SPLASH_THEMES.length).toBeGreaterThan(0);
    for (const t of SPLASH_THEMES) {
      expect(THEMES, `${t} has splash assets but is not a real accent`).toContain(t);
    }
  });

  // layout.tsx renders the links on the server, where it cannot know the user's
  // accent, so it emits the default one. A default with no generated splash
  // would ship a broken href to every visitor.
  it("includes the default accent, which is what the server renders", () => {
    expect(SPLASH_THEMES).toContain(DEFAULT_THEME);
  });

  it("passes an accent through when it has generated files", () => {
    for (const t of SPLASH_THEMES) {
      expect(splashThemeFor(t)).toBe(t);
    }
  });

  it("folds an accent with no generated files back onto the default", () => {
    const ungenerated = THEMES.filter((t) => !SPLASH_THEMES.includes(t));
    for (const t of ungenerated) {
      expect(splashThemeFor(t), `${t} would point at a splash that does not exist`).toBe(
        DEFAULT_THEME,
      );
    }
  });
});
