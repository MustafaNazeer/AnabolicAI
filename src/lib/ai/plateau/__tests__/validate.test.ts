import { describe, it, expect } from "vitest";
import { validateSuggestion } from "@/lib/ai/plateau/validate";
import { MAX_SUGGESTION_CHARS } from "@/lib/ai/plateau/schema";

describe("validateSuggestion", () => {
  it("accepts a valid suggestion and trims the text", () => {
    expect(
      validateSuggestion({ kind: "deload", text: "  Drop to 175 for a session.  " }),
    ).toEqual({ kind: "deload", text: "Drop to 175 for a session." });
  });

  it("rejects a kind outside the enum", () => {
    expect(validateSuggestion({ kind: "form", text: "Fix your arch." })).toBeNull();
  });

  it("rejects empty and whitespace only text", () => {
    expect(validateSuggestion({ kind: "weight", text: "" })).toBeNull();
    expect(validateSuggestion({ kind: "weight", text: "   " })).toBeNull();
  });

  it("rejects text over the cap and accepts text at it", () => {
    expect(
      validateSuggestion({ kind: "rest", text: "a".repeat(MAX_SUGGESTION_CHARS + 1) }),
    ).toBeNull();
    expect(
      validateSuggestion({ kind: "rest", text: "a".repeat(MAX_SUGGESTION_CHARS) }),
    ).not.toBeNull();
  });

  it("rejects non objects and missing fields", () => {
    expect(validateSuggestion(null)).toBeNull();
    expect(validateSuggestion("deload")).toBeNull();
    expect(validateSuggestion({ kind: "deload" })).toBeNull();
    expect(validateSuggestion({ text: "hi" })).toBeNull();
    expect(validateSuggestion({ kind: 3, text: "hi" })).toBeNull();
  });
});
