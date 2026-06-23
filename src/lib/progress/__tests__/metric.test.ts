import { describe, it, expect } from "vitest";
import { resolveMetric, DEFAULT_METRIC } from "@/lib/progress/metric";

describe("resolveMetric", () => {
  it("defaults to gym", () => {
    expect(DEFAULT_METRIC).toBe("gym");
    expect(resolveMetric(null)).toBe("gym");
    expect(resolveMetric("nonsense")).toBe("gym");
  });
  it("accepts the known metrics", () => {
    expect(resolveMetric("volume")).toBe("volume");
    expect(resolveMetric("prs")).toBe("prs");
    expect(resolveMetric("gym")).toBe("gym");
  });
});
