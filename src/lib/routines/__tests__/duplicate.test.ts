import { describe, it, expect } from "vitest";
import { copyRoutineName } from "@/lib/routines/duplicate";

describe("copyRoutineName", () => {
  it("appends ' copy' to a normal name", () => {
    expect(copyRoutineName("Push Day")).toBe("Push Day copy");
  });

  it("handles an empty name", () => {
    expect(copyRoutineName("")).toBe(" copy");
  });

  it("caps the result at 200 characters, still ending in ' copy'", () => {
    const long = "x".repeat(205);
    const result = copyRoutineName(long);
    expect(result.length).toBe(200);
    expect(result.endsWith(" copy")).toBe(true);
  });

  it("does not truncate a name that fits within 200 with the suffix", () => {
    const name = "y".repeat(195); // 195 + " copy" (5) = 200 exactly
    const result = copyRoutineName(name);
    expect(result).toBe(`${name} copy`);
    expect(result.length).toBe(200);
  });
});
