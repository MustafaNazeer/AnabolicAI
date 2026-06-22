import { describe, it, expect } from "vitest";
import { formatDuration } from "@/lib/workout/timer";

describe("formatDuration", () => {
  it("formats minutes and seconds", () => {
    expect(formatDuration(0)).toBe("0:00");
    expect(formatDuration(9)).toBe("0:09");
    expect(formatDuration(90)).toBe("1:30");
    expect(formatDuration(125)).toBe("2:05");
  });
  it("clamps negatives", () => {
    expect(formatDuration(-5)).toBe("0:00");
  });
});
