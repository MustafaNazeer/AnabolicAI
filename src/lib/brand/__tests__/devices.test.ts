import { describe, it, expect } from "vitest";
import { IPHONE_SPLASH, splashFile, splashLinks } from "../devices";

describe("splash devices", () => {
  it("covers a representative span of current iPhones", () => {
    expect(IPHONE_SPLASH.length).toBeGreaterThanOrEqual(10);
  });

  it("derives the px filename from css size and ratio", () => {
    const d = { name: "test", cssWidth: 393, cssHeight: 852, ratio: 3 as const };
    expect(splashFile(d)).toBe("splash-1179x2556.png");
  });

  it("builds one portrait startup-image link per device", () => {
    const links = splashLinks();
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
    const links = splashLinks();
    const hit = links.find((l) => l.media.includes("(device-width: 393px)") && l.media.includes("(device-height: 852px)"));
    expect(hit).toBeTruthy();
    expect(hit!.href).toBe("/splash/splash-1179x2556.png");
  });
});
