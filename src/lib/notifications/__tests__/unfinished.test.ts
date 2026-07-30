import { describe, it, expect } from "vitest";
import { unfinishedWorkoutPayload } from "@/lib/notifications/payloads";
import { shouldNudgeUnfinished } from "@/lib/notifications/schedule";

describe("unfinishedWorkoutPayload", () => {
  it("names the routine and links to the open session", () => {
    expect(unfinishedWorkoutPayload("Push Day", "sess1")).toEqual({
      title: "Workout still open",
      body: "Push Day is still open. Finish it or clear it out.",
      url: "/log/sess1",
      tag: "unfinished",
    });
  });
});

describe("shouldNudgeUnfinished", () => {
  const on = { notif_master: true, notif_unfinished: true };
  const stale = { isStale: true, alreadyNotified: false };

  it("sends when everything lines up", () => {
    expect(shouldNudgeUnfinished(on, stale)).toBe(true);
  });

  it("respects the master switch", () => {
    expect(
      shouldNudgeUnfinished({ notif_master: false, notif_unfinished: true }, stale),
    ).toBe(false);
  });

  it("respects its own toggle", () => {
    expect(
      shouldNudgeUnfinished({ notif_master: true, notif_unfinished: false }, stale),
    ).toBe(false);
  });

  it("stays quiet for a session still in progress", () => {
    expect(
      shouldNudgeUnfinished(on, { isStale: false, alreadyNotified: false }),
    ).toBe(false);
  });

  it("only fires once per session", () => {
    expect(shouldNudgeUnfinished(on, { isStale: true, alreadyNotified: true })).toBe(
      false,
    );
  });
});
