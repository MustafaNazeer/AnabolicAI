import { describe, it, expect } from "vitest";
import { formatDuration, secondsUntil } from "@/lib/workout/timer";

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

describe("secondsUntil", () => {
  it("counts whole seconds to the deadline", () => {
    expect(secondsUntil(60_000, 0)).toBe(60);
    expect(secondsUntil(60_000, 30_000)).toBe(30);
  });

  it("rounds a part second up, so nearly one second never reads as zero", () => {
    expect(secondsUntil(60_000, 59_500)).toBe(1);
    expect(secondsUntil(60_000, 59_999)).toBe(1);
  });

  it("reads zero exactly at the deadline", () => {
    expect(secondsUntil(60_000, 60_000)).toBe(0);
  });

  it("clamps once the deadline has passed, however long ago", () => {
    expect(secondsUntil(60_000, 90_000)).toBe(0);
    expect(secondsUntil(60_000, 600_000)).toBe(0);
  });
});
