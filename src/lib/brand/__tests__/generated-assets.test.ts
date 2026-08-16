import { describe, it, expect } from "vitest";
import { statSync, readdirSync, readFileSync } from "node:fs";
import sharp from "sharp";
import { IPHONE_SPLASH, splashFile } from "../devices";
import { appleIconFile } from "../themeAssets";
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

  it("ships one splash per device at the px size", async () => {
    for (const d of IPHONE_SPLASH) {
      const f = `public/splash/${splashFile(d)}`;
      expect(exists(f)).toBe(true);
      const m = await sharp(f).metadata();
      expect(m.width).toBe(d.cssWidth * d.ratio);
      expect(m.height).toBe(d.cssHeight * d.ratio);
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
    for (const d of IPHONE_SPLASH) {
      expect(splashFile(d), `${d.name} generates a name the matcher misses`).toMatch(
        /^splash-\d+x\d+\.png$/,
      );
    }
    for (const f of readdirSync("public/splash")) {
      expect(f, `${f} is shipped but the matcher does not exclude it`).toMatch(
        /^splash-\d+x\d+\.png$/,
      );
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
      "splash/splash-\\\\d+x\\\\d+\\\\.png$",
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
});
