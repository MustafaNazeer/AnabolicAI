import { describe, it, expect } from "vitest";
import { appName } from "@/lib/app";

describe("app metadata", () => {
  it("exposes the product name", () => {
    expect(appName).toBe("Onyx");
  });
});
