import { describe, it, expect } from "vitest";
import {
  dayNameInZone,
  isReminderDay,
  shouldSendReminder,
  shouldWarnStreak,
  shouldSendWeeklyRecap,
} from "@/lib/notifications/schedule";
import {
  workoutReminderPayload,
  streakWarningPayload,
  weeklyRecapPayload,
} from "@/lib/notifications/payloads";

describe("dayNameInZone", () => {
  it("returns the lowercase short weekday in the given zone", () => {
    // 2026-06-22 is a Monday in Chicago.
    expect(dayNameInZone(new Date("2026-06-22T15:00:00Z"), "America/Chicago")).toBe("mon");
  });
});

describe("isReminderDay", () => {
  it("matches a day inside a comma list and rejects otherwise", () => {
    expect(isReminderDay("mon,wed,fri", "wed")).toBe(true);
    expect(isReminderDay("mon,wed,fri", "tue")).toBe(false);
    expect(isReminderDay(null, "mon")).toBe(false);
    expect(isReminderDay("", "mon")).toBe(false);
  });
});

describe("shouldSendReminder", () => {
  it("needs master, the reminder toggle, and today in the day list", () => {
    const s = { notif_master: true, notif_reminder: true, reminder_days: "mon,wed" };
    expect(shouldSendReminder(s, "mon")).toBe(true);
    expect(shouldSendReminder(s, "tue")).toBe(false);
    expect(shouldSendReminder({ ...s, notif_master: false }, "mon")).toBe(false);
    expect(shouldSendReminder({ ...s, notif_reminder: false }, "mon")).toBe(false);
  });
});

describe("shouldWarnStreak", () => {
  it("warns only on Sunday with an active streak and no workout yet this week", () => {
    const s = { notif_master: true, notif_streak: true };
    expect(shouldWarnStreak(s, { isSunday: true, currentStreak: 3, workoutsThisWeek: 0 })).toBe(true);
    expect(shouldWarnStreak(s, { isSunday: false, currentStreak: 3, workoutsThisWeek: 0 })).toBe(false);
    expect(shouldWarnStreak(s, { isSunday: true, currentStreak: 0, workoutsThisWeek: 0 })).toBe(false);
    expect(shouldWarnStreak(s, { isSunday: true, currentStreak: 3, workoutsThisWeek: 1 })).toBe(false);
    expect(shouldWarnStreak({ ...s, notif_streak: false }, { isSunday: true, currentStreak: 3, workoutsThisWeek: 0 })).toBe(false);
  });
});

describe("shouldSendWeeklyRecap", () => {
  it("sends on Sunday only when the user trained this week", () => {
    const s = { notif_master: true, notif_weekly: true };
    expect(shouldSendWeeklyRecap(s, { isSunday: true, workoutsThisWeek: 4 })).toBe(true);
    expect(shouldSendWeeklyRecap(s, { isSunday: true, workoutsThisWeek: 0 })).toBe(false);
    expect(shouldSendWeeklyRecap(s, { isSunday: false, workoutsThisWeek: 4 })).toBe(false);
    expect(shouldSendWeeklyRecap({ ...s, notif_weekly: false }, { isSunday: true, workoutsThisWeek: 4 })).toBe(false);
  });
});

describe("scheduled payloads", () => {
  it("builds plain-language pushes", () => {
    expect(workoutReminderPayload()).toEqual({
      title: "Time to train",
      body: "You have a workout scheduled today. Open Onyx to start.",
      url: "/",
      tag: "reminder",
    });
    expect(streakWarningPayload(3)).toEqual({
      title: "Keep your streak",
      body: "Your 3-week streak ends tonight. Log a workout today to keep it going.",
      url: "/",
      tag: "streak",
    });
    expect(weeklyRecapPayload(4, 28000)).toEqual({
      title: "This week in Onyx",
      body: "4 workouts, 28k lbs moved. Nice work.",
      url: "/",
      tag: "weekly",
    });
  });
});
