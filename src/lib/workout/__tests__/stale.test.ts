import { describe, it, expect } from "vitest";
import { lastActivityAt, isStale, STALE_AFTER_MS } from "@/lib/workout/stale";

const START = "2026-07-30T10:00:00.000Z";

describe("lastActivityAt", () => {
  it("falls back to the start time when nothing was logged", () => {
    expect(lastActivityAt(START, [])).toBe(START);
  });

  it("takes the newest logged set", () => {
    expect(
      lastActivityAt(START, [
        "2026-07-30T10:20:00.000Z",
        "2026-07-30T10:40:00.000Z",
        "2026-07-30T10:05:00.000Z",
      ]),
    ).toBe("2026-07-30T10:40:00.000Z");
  });

  it("ignores set times older than the start", () => {
    expect(lastActivityAt(START, ["2026-07-30T09:00:00.000Z"])).toBe(START);
  });
});

describe("isStale", () => {
  it("is six hours", () => {
    expect(STALE_AFTER_MS).toBe(6 * 60 * 60 * 1000);
  });

  it("is false just under the threshold", () => {
    const now = new Date(Date.parse(START) + STALE_AFTER_MS - 1000);
    expect(isStale(START, now)).toBe(false);
  });

  it("is false exactly at the threshold", () => {
    const now = new Date(Date.parse(START) + STALE_AFTER_MS);
    expect(isStale(START, now)).toBe(false);
  });

  it("is true just past the threshold", () => {
    const now = new Date(Date.parse(START) + STALE_AFTER_MS + 1000);
    expect(isStale(START, now)).toBe(true);
  });

  it("is false when the clock is behind the activity", () => {
    const now = new Date(Date.parse(START) - 60_000);
    expect(isStale(START, now)).toBe(false);
  });
});
