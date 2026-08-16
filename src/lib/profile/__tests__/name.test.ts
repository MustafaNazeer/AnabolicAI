import { describe, it, expect } from "vitest";
import { greetingName, needsName, parseDisplayName } from "@/lib/profile/name";

describe("greetingName", () => {
  it("uses the name the person gave", () => {
    expect(greetingName("Mustafa", "mustafa.nazeer06@gmail.com")).toBe("Mustafa");
  });

  // What the app did for everyone before there was anywhere to put a real name.
  // An account that never answers the prompt has to read exactly as it did.
  it("falls back to the email's local part when there is no name", () => {
    expect(greetingName(null, "mustafa.nazeer06@gmail.com")).toBe(
      "mustafa.nazeer06",
    );
  });

  // A stored empty string is someone who was asked and declined. It must not
  // read as a blank greeting.
  it("falls back when the stored name is empty or only spaces", () => {
    expect(greetingName("", "her@example.com")).toBe("her");
    expect(greetingName("   ", "her@example.com")).toBe("her");
  });

  it("has something to say with neither a name nor an email", () => {
    expect(greetingName(null, null)).toBe("there");
  });
});

describe("needsName", () => {
  // THE DISTINCTION THE WHOLE PROMPT RESTS ON. Never asked is null; asked and
  // declined is an empty string. Treating them alike would make a one time
  // question permanent.
  it("asks when the column has never been written", () => {
    expect(needsName(null)).toBe(true);
    expect(needsName(undefined)).toBe(true);
  });

  it("does not ask again once anything has been written, including a refusal", () => {
    expect(needsName("Mustafa")).toBe(false);
    expect(needsName("")).toBe(false);
  });
});

describe("parseDisplayName", () => {
  it("trims what was typed", () => {
    expect(parseDisplayName("  Mustafa  ")).toEqual({ name: "Mustafa" });
  });

  it("refuses a blank name rather than storing one", () => {
    expect(parseDisplayName("   ")).toEqual({ error: "Tell me what to call you." });
  });

  // Mirrors display_name_length in 0022, so the message is this app's rather
  // than a raw constraint violation from Postgres.
  it("refuses a name the column could not hold", () => {
    expect(parseDisplayName("m".repeat(41))).toEqual({ error: "That name is too long." });
    expect(parseDisplayName("m".repeat(40))).toEqual({ name: "m".repeat(40) });
  });
});
