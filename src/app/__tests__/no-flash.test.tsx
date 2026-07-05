import { describe, it, expect } from "vitest";
import { NO_FLASH_SCRIPT } from "@/app/noFlashScript";

describe("no-flash script", () => {
  it("resolves both attributes before paint", () => {
    expect(NO_FLASH_SCRIPT).toContain("onyx-theme");
    expect(NO_FLASH_SCRIPT).toContain("onyx-mode");
    expect(NO_FLASH_SCRIPT).toContain("data-mode");
    expect(NO_FLASH_SCRIPT).toContain("prefers-color-scheme: dark");
  });
});
