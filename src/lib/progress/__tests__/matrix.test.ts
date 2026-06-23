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
  it("summarises the most recent week per metric", () => {
    const days: MatrixDay[] = Array.from({ length: 35 }, (_, i) =>
      day({ dateKey: `d${i}` }),
    );
    // last 7 days: 3 trained, total volume 9000, 2 PRs
    days[28] = day({ dateKey: "d28", trained: true, volume: 3000, prCount: 1 });
    days[30] = day({ dateKey: "d30", trained: true, volume: 4000, prCount: 1 });
    days[32] = day({ dateKey: "d32", trained: true, volume: 2000 });
    expect(matrixHeroSummary(days, "gym").value).toBe("3");
    expect(matrixHeroSummary(days, "gym").unit).toBe("of 7 days");
    expect(matrixHeroSummary(days, "prs").value).toBe("2");
    expect(matrixHeroSummary(days, "volume").unit).toBe("lbs");
  });
});
