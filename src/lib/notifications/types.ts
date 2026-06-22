export type NotificationSettings = {
  notif_master: boolean;
  notif_rest_timer: boolean;
  notif_reminder: boolean;
  reminder_days: string | null;
  reminder_time: string | null;
  notif_streak: boolean;
  notif_pr: boolean;
  notif_weekly: boolean;
  rest_timer_seconds: number;
};

export const NOTIFICATION_DEFAULTS: NotificationSettings = {
  notif_master: false,
  notif_rest_timer: true,
  notif_reminder: false,
  reminder_days: null,
  reminder_time: null,
  notif_streak: true,
  notif_pr: true,
  notif_weekly: true,
  rest_timer_seconds: 120,
};
