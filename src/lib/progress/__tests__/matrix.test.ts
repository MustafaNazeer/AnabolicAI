import { describe, it, expect } from "vitest";
import { matrixWindow, buildMatrix, dateKeyInZone } from "@/lib/progress/matrix";

const TZ = "America/Chicago";

describe("matrixWindow", () => {
  it("returns 35 Monday-start day keys ending in the current week", () => {
    const now = new Date("2026-06-24T12:00:00Z"); // a Wednesday
    const keys = matrixWindow(now, TZ);
    expect(keys).toHaveLength(35);
    expect(keys[0]).toBe("2026-05-25"); // Monday four weeks before this Monday
    expect(keys[28]).toBe("2026-06-22"); // Monday of the current week
    expect(keys[34]).toBe("2026-06-28"); // the Sunday of the current week
  });
});

describe("buildMatrix", () => {
  it("buckets sessions, volume, and PRs onto the right day in zone", () => {
    const now = new Date("2026-06-24T12:00:00Z");
    const days = buildMatrix(
      {
        sessions: [{ completedAt: "2026-06-22T15:00:00Z" }],
        sets: [
          { weight: 100, reps: 5, loggedAt: "2026-06-22T15:00:00Z" },
          { weight: 50, reps: 10, loggedAt: "2026-06-22T15:10:00Z" },
        ],
        prDates: ["2026-06-22T15:05:00Z"],
      },
      now,
      TZ,
    );
    const monday = days.find((d) => d.dateKey === "2026-06-22");
    expect(monday).toBeDefined();
    expect(monday!.trained).toBe(true);
    expect(monday!.volume).toBe(1000); // 100*5 + 50*10
    expect(monday!.prCount).toBe(1);
    const rest = days.find((d) => d.dateKey === "2026-06-23");
    expect(rest!.trained).toBe(false);
    expect(rest!.volume).toBe(0);
  });

  it("ignores data outside the 35-day window", () => {
    const now = new Date("2026-06-24T12:00:00Z");
    const days = buildMatrix(
      { sessions: [{ completedAt: "2026-01-01T15:00:00Z" }], sets: [], prDates: [] },
      now,
      TZ,
    );
    expect(days.every((d) => !d.trained)).toBe(true);
  });
});

describe("dateKeyInZone", () => {
  it("buckets a late-night UTC instant into the Chicago calendar day", () => {
    // 2026-06-23T02:00:00Z is 2026-06-22 21:00 in Chicago
    expect(dateKeyInZone("2026-06-23T02:00:00Z", TZ)).toBe("2026-06-22");
  });
});
