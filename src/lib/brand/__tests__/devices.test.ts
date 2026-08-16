import { describe, it, expect } from "vitest";
import { IPHONE_SPLASH, splashFile, splashLinks } from "../devices";
import { SPLASH_THEMES } from "../themeAssets";
import { DEFAULT_THEME } from "@/lib/theme";

describe("splash devices", () => {
  it("covers a representative span of current iPhones", () => {
    expect(IPHONE_SPLASH.length).toBeGreaterThanOrEqual(10);
  });

  it("derives the px filename from css size and ratio", () => {
    const d = { name: "test", cssWidth: 393, cssHeight: 852, ratio: 3 as const };
    expect(splashFile(d, "crimson")).toBe("splash-crimson-1179x2556.png");
  });

  // A generated PNG cannot follow a CSS custom property, so the accent is in
  // the filename rather than in the image. One set per accent is the cost.
  it("gives each accent its own file for the same device", () => {
    const d = { name: "test", cssWidth: 393, cssHeight: 852, ratio: 3 as const };
    const files = SPLASH_THEMES.map((t) => splashFile(d, t));
    expect(new Set(files).size).toBe(SPLASH_THEMES.length);
  });

  it("builds one portrait startup-image link per device", () => {
    const links = splashLinks(DEFAULT_THEME);
    expect(links.length).toBe(IPHONE_SPLASH.length);
    for (const l of links) {
      expect(l.rel).toBe("apple-touch-startup-image");
      expect(l.href.startsWith("/splash/splash-")).toBe(true);
      expect(l.media).toContain("(device-width:");
      expect(l.media).toContain("(device-height:");
      expect(l.media).toContain("-webkit-device-pixel-ratio:");
      expect(l.media).toContain("(orientation: portrait)");
    }
  });

  it("includes the iPhone 15/16 logical 393x852 @3 device", () => {
    const links = splashLinks(DEFAULT_THEME);
    const hit = links.find(
      (l) =>
        l.media.includes("(device-width: 393px)") &&
        l.media.includes("(device-height: 852px)"),
    );
    expect(hit).toBeTruthy();
    expect(hit!.href).toBe(`/splash/splash-${DEFAULT_THEME}-1179x2556.png`);
  });

  // ThemeProvider rewrites the hrefs by looking each link up by its media
  // query, so the media string must not depend on the accent. If it did, a
  // theme change would match nothing and silently leave every href alone.
  it("keeps the media query identical across accents", () => {
    const byTheme = SPLASH_THEMES.map((t) => splashLinks(t).map((l) => l.media));
    for (const medias of byTheme) {
      expect(medias).toEqual(byTheme[0]);
    }
  });

  it("gives every device a distinct media query, so the lookup is unambiguous", () => {
    const medias = splashLinks(DEFAULT_THEME).map((l) => l.media);
    expect(new Set(medias).size).toBe(medias.length);
  });
});
