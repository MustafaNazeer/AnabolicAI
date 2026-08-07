import { describe, it, expect } from "vitest";
import { statSync, readdirSync } from "node:fs";
import sharp from "sharp";
import { IPHONE_SPLASH, splashFile } from "../devices";

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
      expect(f, `${f} is shipped but the matcher does not exclude it`).toMatch(
        /^icon-(?:192|512|maskable-512)\.png$/,
      );
    }
  });
});
