export const APP_TIMEZONE = "America/Chicago";

const DAY_SHORT = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function dayNameInZone(now: Date, timeZone: string): string {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  })
    .format(now)
    .toLowerCase();
  return wd; // "mon", "tue", ...
}

// A Date whose local-getter fields (getFullYear/getMonth/getDate/getDay)
// reflect the wall clock in `timeZone`, so the date-only helpers in week.ts
// land on the correct calendar day regardless of the server's own zone.
export function zonedNow(now: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  const hour = get("hour") % 24; // Intl can emit "24" at midnight
  return new Date(
    get("year"),
    get("month") - 1,
    get("day"),
    hour,
    get("minute"),
    get("second"),
  );
}

export function isSundayInZone(now: Date, timeZone: string): boolean {
  return dayNameInZone(now, timeZone) === "sun";
}

export function isReminderDay(
  reminderDays: string | null,
  dayName: string,
): boolean {
  if (!reminderDays) return false;
  return reminderDays
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean)
    .includes(dayName);
}

export function shouldSendReminder(
  s: {
    notif_master: boolean;
    notif_reminder: boolean;
    reminder_days: string | null;
  },
  dayName: string,
): boolean {
  return (
    s.notif_master &&
    s.notif_reminder &&
    isReminderDay(s.reminder_days, dayName)
  );
}

export function shouldWarnStreak(
  s: { notif_master: boolean; notif_streak: boolean },
  ctx: { isSunday: boolean; currentStreak: number; workoutsThisWeek: number },
): boolean {
  return (
    s.notif_master &&
    s.notif_streak &&
    ctx.isSunday &&
    ctx.currentStreak >= 1 &&
    ctx.workoutsThisWeek === 0
  );
}

export function shouldSendWeeklyRecap(
  s: { notif_master: boolean; notif_weekly: boolean },
  ctx: { isSunday: boolean; workoutsThisWeek: number },
): boolean {
  return (
    s.notif_master && s.notif_weekly && ctx.isSunday && ctx.workoutsThisWeek > 0
  );
}

// Fires once per session: alreadyNotified is the session's own flag, which the
// caller claims with a conditional update so a concurrent run cannot send twice.
export function shouldNudgeUnfinished(
  s: { notif_master: boolean; notif_unfinished: boolean },
  ctx: { isStale: boolean; alreadyNotified: boolean },
): boolean {
  return (
    s.notif_master && s.notif_unfinished && ctx.isStale && !ctx.alreadyNotified
  );
}

// DAY_SHORT is exported for callers that render the day picker order.
export { DAY_SHORT };
