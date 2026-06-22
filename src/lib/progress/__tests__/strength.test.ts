import { describe, it, expect } from "vitest";
import {
  estimatedOneRepMax,
  setVolume,
  formatCompact,
} from "@/lib/progress/strength";

describe("estimatedOneRepMax (Epley)", () => {
  it("treats a single rep as its own max", () => {
    expect(estimatedOneRepMax(225, 1)).toBe(225);
  });
  it("applies the Epley formula for multiple reps", () => {
    expect(estimatedOneRepMax(100, 5)).toBeCloseTo(116.667, 2);
    expect(estimatedOneRepMax(135, 8)).toBeCloseTo(171, 0);
  });
});

describe("setVolume", () => {
  it("multiplies weight by reps", () => {
    expect(setVolume(135, 8)).toBe(1080);
  });
});

describe("formatCompact", () => {
  it("leaves values under 1000 whole", () => {
    expect(formatCompact(950)).toBe("950");
  });
  it("uses one decimal of k under 10k and whole k at or above", () => {
    expect(formatCompact(1500)).toBe("1.5k");
    expect(formatCompact(28000)).toBe("28k");
  });
});
