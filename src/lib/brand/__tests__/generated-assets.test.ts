import { describe, it, expect } from "vitest";
import { statSync } from "node:fs";
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
});
