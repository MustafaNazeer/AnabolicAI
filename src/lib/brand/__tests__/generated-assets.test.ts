import { describe, it, expect } from "vitest";
import { statSync, readdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { IPHONE_SPLASH, splashFile } from "../devices";
import { appleIconFile, SPLASH_THEMES } from "../themeAssets";
import { THEMES } from "@/lib/theme";

const exists = (f: string) => { try { return statSync(f).isFile(); } catch { return false; } };

describe("generated brand assets", () => {
  it("ships the manifest icons at the right dimensions", async () => {
    for (const [f, n] of [["public/icons/icon-192.png", 192], ["public/icons/icon-512.png", 512], ["public/icons/icon-maskable-512.png", 512]] as const) {
      expect(exists(f)).toBe(true);
      const m = await sharp(f).metadata();
      expect(m.width).toBe(n); expect(m.height).toBe(n);
    }
  });

  it("ships a 180x180 apple-icon and a favicon.ico", async () => {
    expect(exists("src/app/apple-icon.png")).toBe(true);
    const m = await sharp("src/app/apple-icon.png").metadata();
    expect(m.width).toBe(180); expect(m.height).toBe(180);
    expect(exists("src/app/favicon.ico")).toBe(true);
    expect(exists("src/app/icon.svg")).toBe(true);
  });

  // One per accent, because iOS snapshots whatever the apple-touch-icon link
  // points at when the user taps Add to Home Screen. A theme with no file
  // would leave the link pointing at a 404 and the install would take no icon
  // at all, which is worse than taking the default one.
  it("ships a 180x180 apple-icon for every theme", async () => {
    for (const theme of THEMES) {
      const f = `public/icons/${appleIconFile(theme)}`;
      expect(exists(f), `${theme} has no generated apple icon`).toBe(true);
      const m = await sharp(f).metadata();
      expect(m.width).toBe(180); expect(m.height).toBe(180);
    }
  });

  // One set per accent that has one. SPLASH_THEMES is deliberately a subset of
  // THEMES while the launch splash is being proved on a device, and
  // splashThemeFor is what keeps an accent outside that subset from ever being
  // pointed at. This asserts the other half: everything inside it really ships.
  it("ships one splash per device per accent, at the px size", async () => {
    for (const theme of SPLASH_THEMES) {
      for (const d of IPHONE_SPLASH) {
        const f = `public/splash/${splashFile(d, theme)}`;
        expect(exists(f), `${theme} has no splash for ${d.name}`).toBe(true);
        const m = await sharp(f).metadata();
        expect(m.width).toBe(d.cssWidth * d.ratio);
        expect(m.height).toBe(d.cssHeight * d.ratio);
      }
    }
  });

  // The proxy matcher excludes these two directories by filename shape,
  // and Next requires that matcher to be a constant, so it cannot import this
  // table and will drift silently when a device is added or an icon renamed.
  // A file that stops matching the shape would start being redirected to
  // /sign-in for signed out visitors, which is how the favicon broke once
  // before. This is where that drift gets caught.
  //
  // Both patterns are written as literals, deliberately. Semgrep's
  // detect-non-literal-regexp rule blocks building one from a variable. Run
  // that gate before pushing with "pip install semgrep==1.172.0", the version
  // the workflow container pins, then "semgrep scan --config p/default --error".
  it("names every generated asset in the shape the proxy matcher excludes", () => {
    for (const theme of SPLASH_THEMES) {
      for (const d of IPHONE_SPLASH) {
        expect(
          splashFile(d, theme),
          `${theme}/${d.name} generates a name the matcher misses`,
        ).toMatch(/^splash-[a-z]+-\d+x\d+\.png$/);
      }
    }
    // startsWith rather than a RegExp built from the accent: semgrep's
    // detect-non-literal-regexp rule blocks the dynamic form and runs in CI
    // only, so it cannot be caught locally without the command in the comment
    // above. A leftover file from the un-accented naming fails here, which is
    // what stops the old set being shipped alongside the new one.
    for (const f of readdirSync("public/splash")) {
      const ok =
        f.endsWith(".png") && SPLASH_THEMES.some((t) => f.startsWith(`splash-${t}-`));
      expect(ok, `${f} is shipped but the matcher does not exclude it`).toBe(true);
    }
    for (const f of readdirSync("public/icons")) {
      const ok =
        /^icon-(?:192|512|maskable-512)\.png$/.test(f) ||
        /^apple-icon-[a-z]+\.png$/.test(f);
      expect(ok, `${f} is shipped but the matcher does not exclude it`).toBe(true);
    }
  });

  // The test above catches a FILE that stops matching the matcher. This one
  // catches the other direction, the MATCHER losing a pattern the files still
  // rely on, which nothing else would notice until a signed out visitor got a
  // redirect to /sign-in where an icon should have been.
  it("keeps every shape the generated assets rely on in the proxy matcher", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    for (const pattern of [
      "icons/icon-(?:192|512|maskable-512)\\\\.png$",
      "splash/splash-(?:",
      "-\\\\d+x\\\\d+\\\\.png$",
      "apple-icon\\\\.png$",
      "icon\\\\.svg$",
    ]) {
      expect(proxy, `the matcher no longer excludes ${pattern}`).toContain(pattern);
    }
  });

  // The accents are enumerated in the matcher rather than matched as a shape,
  // so that a nonexistent "/icons/apple-icon-nope.png" still reaches the proxy
  // instead of falling through to a policy-less 404. The cost of that choice is
  // that adding a sixth accent means editing the matcher, and this is what
  // makes forgetting it fail here rather than in production.
  it("excludes every theme's apple icon by name in the proxy matcher", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    const start = proxy.indexOf("icons/apple-icon-(?:");
    expect(start, "the matcher has no per theme apple icon pattern").toBeGreaterThan(-1);
    const group = proxy.slice(start, proxy.indexOf(")", start));
    for (const theme of THEMES) {
      expect(
        group,
        `${theme} is not excluded, so its icon would 307 to /sign-in`,
      ).toContain(theme);
    }
  });

  // Same enumeration, same reason, for the splash set. Widening SPLASH_THEMES
  // without widening the matcher fails here rather than in production, where a
  // signed out launch would fetch the new accent's splash and get a redirect to
  // /sign-in instead of an image.
  it("excludes every generated splash accent by name in the proxy matcher", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    const start = proxy.indexOf("splash/splash-(?:");
    expect(start, "the matcher has no per accent splash pattern").toBeGreaterThan(-1);
    const group = proxy.slice(start, proxy.indexOf(")", start));
    for (const theme of SPLASH_THEMES) {
      expect(
        group,
        `${theme} is not excluded, so its splash would 307 to /sign-in`,
      ).toContain(theme);
    }
  });

  // The counterpart the icon set proved live: an accent with no splash behind
  // it must NOT be excluded, so a stray request reaches the proxy and is
  // redirected rather than falling through to a policy-less 404 document.
  it("leaves an accent with no generated splash out of the matcher", () => {
    const proxy = readFileSync("src/proxy.ts", "utf8");
    const start = proxy.indexOf("splash/splash-(?:");
    const group = proxy.slice(start, proxy.indexOf(")", start));
    for (const theme of THEMES.filter((t) => !SPLASH_THEMES.includes(t))) {
      expect(
        group,
        `${theme} is excluded but ships no splash, so its path 404s with no policy`,
      ).not.toContain(theme);
    }
  });
});
