import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { gatherUserSchedule } from "@/lib/notifications/cron";
import { sendToUserWith } from "@/lib/notifications/push";
import {
  workoutReminderPayload,
  streakWarningPayload,
  weeklyRecapPayload,
} from "@/lib/notifications/payloads";
import {
  APP_TIMEZONE,
  zonedNow,
  dayNameInZone,
  isSundayInZone,
  shouldSendReminder,
  shouldWarnStreak,
  shouldSendWeeklyRecap,
} from "@/lib/notifications/schedule";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SettingsRow = {
  user_id: string;
  notif_master: boolean;
  notif_reminder: boolean;
  notif_streak: boolean;
  notif_weekly: boolean;
  reminder_days: string | null;
};

export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ?force=reminder|streak|weekly bypasses the day gate for end-to-end testing.
  const force = new URL(request.url).searchParams.get("force");

  const now = new Date();
  const zoned = zonedNow(now, APP_TIMEZONE);
  const dayName = dayNameInZone(now, APP_TIMEZONE);
  const isSunday = isSundayInZone(now, APP_TIMEZONE);

  const admin = createAdminClient();
  const { data } = await admin
    .from("user_settings")
    .select(
      "user_id, notif_master, notif_reminder, notif_streak, notif_weekly, reminder_days",
    )
    .eq("notif_master", true);
  const users = (data ?? []) as SettingsRow[];

  let sent = 0;
  for (const u of users) {
    try {
      const g = await gatherUserSchedule(admin, u.user_id, zoned);

      if (force === "reminder" || shouldSendReminder(u, dayName)) {
        await sendToUserWith(admin, u.user_id, workoutReminderPayload());
        sent++;
      }
      if (
        force === "streak" ||
        shouldWarnStreak(u, {
          isSunday,
          currentStreak: g.currentStreak,
          workoutsThisWeek: g.workoutsThisWeek,
        })
      ) {
        await sendToUserWith(
          admin,
          u.user_id,
          streakWarningPayload(Math.max(g.currentStreak, 1)),
        );
        sent++;
      }
      if (
        force === "weekly" ||
        shouldSendWeeklyRecap(u, {
          isSunday,
          workoutsThisWeek: g.workoutsThisWeek,
        })
      ) {
        await sendToUserWith(
          admin,
          u.user_id,
          weeklyRecapPayload(g.workoutsThisWeek, g.weeklyVolume),
        );
        sent++;
      }
    } catch {
      // One user's failure must not abort the batch.
    }
  }

  return NextResponse.json({ ok: true, users: users.length, sent });
}
