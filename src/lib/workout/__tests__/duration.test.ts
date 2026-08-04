import { describe, it, expect } from "vitest";
import {
  clampRest,
  describeDuration,
  parseTypedDuration,
  MIN_REST_SECONDS,
  MAX_REST_SECONDS,
} from "@/lib/workout/duration";

describe("clampRest", () => {
  // The five second grid is gone with the wheel. A typed value is kept as
  // typed, because snapping 2:37 to 2:35 reads as a bug when you meant 2:37.
  it("keeps any whole second value", () => {
    expect(clampRest(120)).toBe(120);
    expect(clampRest(150)).toBe(150);
    expect(clampRest(45)).toBe(45);
    expect(clampRest(122)).toBe(122);
    expect(clampRest(157)).toBe(157);
  });

  it("rounds a fractional second to a whole one", () => {
    expect(clampRest(122.4)).toBe(122);
    expect(clampRest(122.6)).toBe(123);
  });

  // user_settings.rest_timer_seconds allows up to 3600, which the wheel cannot
  // show. Clamping is deliberate and is recorded in the design.
  it("clamps above the wheel's ceiling rather than rounding oddly", () => {
    expect(clampRest(3600)).toBe(MAX_REST_SECONDS);
    expect(clampRest(901)).toBe(MAX_REST_SECONDS);
  });

  it("clamps at the floor, since a zero length rest is not a rest", () => {
    expect(clampRest(0)).toBe(MIN_REST_SECONDS);
    expect(clampRest(-30)).toBe(MIN_REST_SECONDS);
    expect(clampRest(2)).toBe(MIN_REST_SECONDS);
  });

  it("falls back to two minutes on a value that is not a number", () => {
    expect(clampRest(Number.NaN)).toBe(120);
    expect(clampRest(Number.POSITIVE_INFINITY)).toBe(120);
  });
});

describe("describeDuration", () => {
  it("reads naturally for a screen reader", () => {
    expect(describeDuration(150)).toBe("2 minutes 30 seconds");
    expect(describeDuration(120)).toBe("2 minutes");
    expect(describeDuration(60)).toBe("1 minute");
    expect(describeDuration(30)).toBe("30 seconds");
    expect(describeDuration(61)).toBe("1 minute 1 second");
  });

  it("never returns an empty string", () => {
    expect(describeDuration(0)).toBe("0 seconds");
  });
});

describe("parseTypedDuration", () => {
  it("reads both boxes", () => {
    expect(parseTypedDuration("2", "30")).toBe(150);
    expect(parseTypedDuration("0", "45")).toBe(45);
  });

  // Both boxes are optional and a blank one simply reads as zero.
  it("reads minutes alone when seconds is blank", () => {
    expect(parseTypedDuration("3", "")).toBe(180);
  });

  it("reads seconds alone when minutes is blank", () => {
    expect(parseTypedDuration("", "45")).toBe(45);
  });

  // This is the close-and-change-nothing case, not an error.
  it("returns null when both boxes are blank", () => {
    expect(parseTypedDuration("", "")).toBeNull();
    expect(parseTypedDuration("  ", " ")).toBeNull();
  });

  it("rolls seconds past sixty into minutes rather than erroring", () => {
    expect(parseTypedDuration("", "90")).toBe(90);
    expect(parseTypedDuration("1", "90")).toBe(150);
  });

  it("clamps at the ceiling", () => {
    expect(parseTypedDuration("99", "")).toBe(MAX_REST_SECONDS);
    expect(parseTypedDuration("15", "30")).toBe(MAX_REST_SECONDS);
  });

  it("clamps at the floor, since a zero length rest is not a rest", () => {
    expect(parseTypedDuration("0", "0")).toBe(MIN_REST_SECONDS);
    expect(parseTypedDuration("0", "2")).toBe(MIN_REST_SECONDS);
  });
});
