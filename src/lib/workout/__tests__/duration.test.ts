import { describe, it, expect } from "vitest";
import {
  clampRest,
  describeDuration,
  MIN_REST_SECONDS,
  MAX_REST_SECONDS,
} from "@/lib/workout/duration";

describe("clampRest", () => {
  it("keeps a value already on the five second grid", () => {
    expect(clampRest(120)).toBe(120);
    expect(clampRest(150)).toBe(150);
    expect(clampRest(45)).toBe(45);
  });

  it("snaps to the nearest five seconds", () => {
    expect(clampRest(122)).toBe(120);
    expect(clampRest(123)).toBe(125);
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
