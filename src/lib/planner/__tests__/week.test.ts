import { describe, it, expect } from "vitest";
import { plannerWeek, balanceCounts, type PlannerDay } from "@/lib/planner/week";
import { APP_TIMEZONE } from "@/lib/notifications/schedule";

describe("plannerWeek", () => {
  // Asserted as the whole seven rather than as the first and last, because
  // first plus last plus a length passes just as happily on a run of seven
  // Mondays. That is the same discrimination gap the splash work found the
  // hard way, where "every link points at the current accent" stayed green
  // while every link held the wrong device's image.
  it("returns seven day keys starting on Monday", () => {
    // 2026-08-16 is a Sunday, so its week runs Mon 10th to Sun 16th.
    const week = plannerWeek(new Date("2026-08-16T12:00:00Z"), APP_TIMEZONE);
    expect(week).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
    ]);
  });

  // The zone is not decoration. 02:00 UTC on Monday the 17th is 21:00 on Sunday
  // the 16th in Chicago, so the two answers are different weeks entirely rather
  // than different days within one. Resolving in UTC would put her on a week
  // that has not started, and the day she just trained would vanish from it.
  //
  // ASSERTED BY COMPARING TWO ZONES FOR ONE INSTANT, and that form is the whole
  // point. Asserting the Chicago answer alone passes on a developer machine
  // already set to Chicago even when the argument is ignored entirely, which is
  // what it did when it was written that way: dropping zonedNow from the source
  // changed nothing here and would only have been caught by CI, which runs UTC.
  // Two zones cannot agree unless the argument is genuinely unused.
  it("resolves the week in the timezone it is given rather than the host's", () => {
    const instant = new Date("2026-08-17T02:00:00Z");

    const chicago = plannerWeek(instant, APP_TIMEZONE);
    const utc = plannerWeek(instant, "UTC");

    expect(chicago[0]).toBe("2026-08-10");
    expect(chicago[6]).toBe("2026-08-16");
    expect(utc[0]).toBe("2026-08-17");
    expect(chicago).not.toEqual(utc);
  });
});

describe("balanceCounts", () => {
  const days: PlannerDay[] = [
    { day: "2026-08-10", done: true, categories: ["lower", "abs"] },
    { day: "2026-08-11", done: true, categories: ["cardio"] },
    { day: "2026-08-12", done: false, categories: ["cardio"] },
  ];

  // Every label on a day counts once. She chose that a day carries all of them
  // rather than one main one, so a doubled up day has to show in both columns
  // or the balance understates the week she actually had.
  it("counts every category on a day, not just the first", () => {
    expect(balanceCounts(days)).toMatchObject({ lower: 1, abs: 1 });
  });

  // THE ASSERTION THAT MATTERS MOST. A day written ahead is a plan, and a plan
  // is not a workout. Counting it would have the app claim training that has
  // not happened, which is the exact thing "done" exists to prevent.
  it("excludes days that were planned but never done", () => {
    expect(balanceCounts(days).cardio).toBe(1);
  });

  it("returns nothing for a week with no completed days", () => {
    expect(balanceCounts([{ day: "2026-08-10", done: false, categories: ["abs"] }])).toEqual(
      {},
    );
  });
});
