import { describe, it, expect } from "vitest";
import { validateInsights } from "@/lib/ai/insights/validate";
import { MAX_INSIGHT_CHARS } from "@/lib/ai/insights/schema";

describe("validateInsights", () => {
  it("accepts one to three sentences and trims them", () => {
    expect(validateInsights({ insights: ["  a  ", "b", "c"] })).toEqual({
      insights: ["a", "b", "c"],
    });
  });

  it("rejects an empty list", () => {
    expect(validateInsights({ insights: [] })).toBeNull();
  });

  it("rejects a fourth insight", () => {
    expect(validateInsights({ insights: ["a", "b", "c", "d"] })).toBeNull();
  });

  it("rejects a non string item", () => {
    expect(validateInsights({ insights: ["a", 7] })).toBeNull();
  });

  it("rejects a blank item", () => {
    expect(validateInsights({ insights: ["a", "   "] })).toBeNull();
  });

  it("rejects an item past the character cap", () => {
    expect(
      validateInsights({ insights: ["x".repeat(MAX_INSIGHT_CHARS + 1)] }),
    ).toBeNull();
  });

  it("rejects non objects and missing fields", () => {
    expect(validateInsights(null)).toBeNull();
    expect(validateInsights("insights")).toBeNull();
    expect(validateInsights({})).toBeNull();
    expect(validateInsights({ insights: "a" })).toBeNull();
  });
});
