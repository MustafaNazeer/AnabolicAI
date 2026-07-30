import { createClient } from "@/lib/supabase/server";
import {
  NOTIFICATION_DEFAULTS,
  type NotificationSettings,
} from "@/lib/notifications/types";

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("user_settings")
    .select(
      "notif_master, notif_rest_timer, notif_reminder, reminder_days, reminder_time, notif_streak, notif_pr, notif_weekly, notif_goal, notif_unfinished, rest_timer_seconds",
    )
    .maybeSingle();
  return { ...NOTIFICATION_DEFAULTS, ...(data ?? {}) };
}
