import { describe, it, expect } from "vitest";
import {
  resolveProgressMetric,
  DEFAULT_PROGRESS_METRIC,
} from "@/lib/progress/progressMetric";

describe("resolveProgressMetric", () => {
  it("returns a known metric unchanged", () => {
    expect(resolveProgressMetric("volume")).toBe("volume");
    expect(resolveProgressMetric("reps")).toBe("reps");
  });

  it("falls back to the default for unknown or missing values", () => {
    expect(resolveProgressMetric("bogus")).toBe(DEFAULT_PROGRESS_METRIC);
    expect(resolveProgressMetric(null)).toBe(DEFAULT_PROGRESS_METRIC);
    expect(resolveProgressMetric(undefined)).toBe(DEFAULT_PROGRESS_METRIC);
  });

  it("defaults to weight", () => {
    expect(DEFAULT_PROGRESS_METRIC).toBe("weight");
  });
});
