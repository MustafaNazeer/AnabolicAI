import { describe, it, expect } from "vitest";
import {
  shouldSendRestPush,
  isRestLive,
  toNotBeforeSeconds,
} from "@/lib/notifications/restPush";

const TOKEN = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";

describe("shouldSendRestPush", () => {
  it("needs both the master switch and the rest push switch", () => {
    expect(shouldSendRestPush({ notif_master: true, notif_rest_push: true })).toBe(true);
    expect(shouldSendRestPush({ notif_master: false, notif_rest_push: true })).toBe(false);
    expect(shouldSendRestPush({ notif_master: true, notif_rest_push: false })).toBe(false);
  });
});

describe("isRestLive", () => {
  it("is live when the token matches an unfinished session", () => {
    expect(isRestLive({ completed_at: null, rest_token: TOKEN }, TOKEN)).toBe(true);
  });

  // The whole point of the token: a rest that was reset and restarted has a
  // new one, so the message scheduled for the old rest arrives stale.
  it("is not live when the token has moved on", () => {
    expect(isRestLive({ completed_at: null, rest_token: OTHER }, TOKEN)).toBe(false);
  });

  it("is not live once the workout is finished", () => {
    expect(
      isRestLive({ completed_at: "2026-08-04T12:00:00Z", rest_token: TOKEN }, TOKEN),
    ).toBe(false);
  });

  it("is not live when the rest was cleared", () => {
    expect(isRestLive({ completed_at: null, rest_token: null }, TOKEN)).toBe(false);
  });

  it("is not live when the session is gone", () => {
    expect(isRestLive(null, TOKEN)).toBe(false);
  });

  it("is not live for an empty token, which must never match", () => {
    expect(isRestLive({ completed_at: null, rest_token: null }, "")).toBe(false);
  });
});

describe("toNotBeforeSeconds", () => {
  // THE TRAP. publishJSON takes notBefore in SECONDS, while the message
  // metadata type in the same package documents it in MILLISECONDS. Passing
  // milliseconds schedules the push roughly 50 years out and it simply never
  // arrives, with no error anywhere.
  it("converts milliseconds to whole seconds", () => {
    expect(toNotBeforeSeconds(1_785_000_000_000)).toBe(1_785_000_000);
  });

  it("floors rather than rounds, so a push is never early", () => {
    expect(toNotBeforeSeconds(1_785_000_000_999)).toBe(1_785_000_000);
  });

  it("refuses a value that is already in seconds", () => {
    // A ten digit value cannot be a plausible millisecond deadline; it is 1970.
    expect(() => toNotBeforeSeconds(1_785_000_000)).toThrow();
  });
});
