import { describe, it, expect } from "vitest";
import { readFileSync, statSync } from "node:fs";
import { appName } from "@/lib/app";

const manifest = JSON.parse(readFileSync("public/manifest.webmanifest", "utf8"));
const exists = (f: string) => { try { return statSync(f).isFile(); } catch { return false; } };

describe("web manifest icons", () => {
  it("has a distinct any entry and a distinct maskable entry", () => {
    const purposes = manifest.icons.map((i: { purpose?: string }) => i.purpose);
    expect(purposes).toContain("any");
    expect(purposes).toContain("maskable");
    // no single entry tagged both
    expect(purposes.every((p: string) => p !== "any maskable")).toBe(true);
  });

  it("references files that exist under public/", () => {
    for (const icon of manifest.icons) {
      expect(exists(`public${icon.src}`)).toBe(true);
    }
  });
});

describe("web manifest identity", () => {
  it("names the app exactly as appName does", () => {
    expect(manifest.name).toBe(appName);
    expect(manifest.short_name).toBe(appName);
  });
});
