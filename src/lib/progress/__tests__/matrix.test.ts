import { describe, it, expect } from "vitest";
import { monthWindow, leadingBlanks, buildMatrix, dateKeyInZone } from "@/lib/progress/matrix";

const TZ = "America/Chicago";

describe("monthWindow", () => {
  // ONE SQUARE PER DAY OF THE MONTH, AND NOTHING ELSE IN IT. This replaced a
  // rolling five week window on 2026-08-16, which always carried part of the
  // previous month and so could show two 1 through 31 runs at once.
  it("returns every day of the current month and no other", () => {
    const now = new Date("2026-06-24T12:00:00Z"); // a Wednesday in June
    const keys = monthWindow(now, TZ);
    expect(keys).toHaveLength(30);
    expect(keys[0]).toBe("2026-06-01");
    expect(keys[29]).toBe("2026-06-30");
    expect(keys.every((k) => k.startsWith("2026-06"))).toBe(true);
  });

  it("gives 31 days for a 31 day month", () => {
    expect(monthWindow(new Date("2026-08-16T12:00:00Z"), TZ)).toHaveLength(31);
  });

  it("gives 28 days for a common February and 29 for a leap one", () => {
    expect(monthWindow(new Date("2026-02-10T12:00:00Z"), TZ)).toHaveLength(28);
    expect(monthWindow(new Date("2028-02-10T12:00:00Z"), TZ)).toHaveLength(29);
  });

  // The zone decides which month it is at the boundary. 01:00Z on the 1st is
  // still 20:00 on the last day of the previous month in Chicago, so resolving
  // in UTC would show the wrong month for five hours every month.
  it("resolves the month in the given timezone rather than in UTC", () => {
    const instant = new Date("2026-09-01T01:00:00Z");
    expect(monthWindow(instant, TZ)[0]).toBe("2026-08-01");
    expect(monthWindow(instant, "UTC")[0]).toBe("2026-09-01");
  });
});

describe("leadingBlanks", () => {
  // The grid is Monday first, so a month starting on a Saturday needs five
  // empty places before its 1st or every column would name the wrong weekday.
  it("counts the empty places before the first of the month", () => {
    expect(leadingBlanks("2026-08-01")).toBe(5); // a Saturday
    expect(leadingBlanks("2026-06-01")).toBe(0); // a Monday
    expect(leadingBlanks("2026-11-01")).toBe(6); // a Sunday
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

import {
  cellState,
  cellIntensity,
  maxVolume,
  matrixHeroSummary,
  type MatrixDay,
} from "@/lib/progress/matrix";

function day(p: Partial<MatrixDay>): MatrixDay {
  return { dateKey: "2026-06-22", trained: false, volume: 0, prCount: 0, ...p };
}

describe("cellState", () => {
  it("gym is on only when trained", () => {
    expect(cellState(day({ trained: true }), "gym")).toBe("on");
    expect(cellState(day({ trained: false }), "gym")).toBe("off");
  });
  it("prs is on for a PR day, faint for a trained day, off otherwise", () => {
    expect(cellState(day({ trained: true, prCount: 1 }), "prs")).toBe("on");
    expect(cellState(day({ trained: true, prCount: 0 }), "prs")).toBe("faint");
    expect(cellState(day({ trained: false }), "prs")).toBe("off");
  });
});

describe("cellIntensity", () => {
  it("scales volume against the window max", () => {
    const days = [day({ volume: 1000 }), day({ volume: 500, dateKey: "x" })];
    const max = maxVolume(days);
    expect(max).toBe(1000);
    expect(cellIntensity(days[0], "volume", max)).toBeCloseTo(1.0);
    expect(cellIntensity(days[1], "volume", max)).toBeGreaterThan(0.5);
    expect(cellIntensity(day({ volume: 0 }), "volume", max)).toBe(0);
  });
});

describe("matrixHeroSummary", () => {
  // MONTHLY SINCE 2026-08-16, matching the calendar it sits above. It used to
  // take the last seven entries of a five week window, which on a month window
  // would mean the last seven days OF THE MONTH rather than the current week,
  // so on the 3rd it would report days that have not happened yet.
  it("summarises the whole month per metric", () => {
    const days: MatrixDay[] = Array.from({ length: 30 }, (_, i) =>
      day({ dateKey: `d${i}` }),
    );
    days[2] = day({ dateKey: "d2", trained: true, volume: 3000, prCount: 1 });
    days[14] = day({ dateKey: "d14", trained: true, volume: 4000, prCount: 1 });
    days[29] = day({ dateKey: "d29", trained: true, volume: 2000 });

    expect(matrixHeroSummary(days, "gym").value).toBe("3");
    expect(matrixHeroSummary(days, "prs").value).toBe("2");
    expect(matrixHeroSummary(days, "volume").unit).toBe("lbs");
  });

  // The denominator is the month's own length, not a fixed 7 or 31, or a
  // 30 day month would claim a 31st day nobody could have trained on.
  it("counts against the length of the month it was given", () => {
    expect(matrixHeroSummary(Array.from({ length: 30 }, () => day({})), "gym").unit).toBe(
      "of 30 days",
    );
    expect(matrixHeroSummary(Array.from({ length: 28 }, () => day({})), "gym").unit).toBe(
      "of 28 days",
    );
  });

  it("says this month rather than the last five weeks", () => {
    for (const metric of ["gym", "volume", "prs"] as const) {
      const caption = matrixHeroSummary([day({})], metric).caption;
      expect(caption).toMatch(/this month/i);
      expect(caption).not.toMatch(/5 weeks/i);
    }
  });
});
