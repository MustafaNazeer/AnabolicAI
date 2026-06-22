"use client";

import { useState, useTransition } from "react";
import {
  saveSubscription,
  removeSubscription,
  updateNotificationSettings,
} from "@/lib/notifications/actions";
import { enablePush, disablePush } from "@/lib/notifications/subscribe";
import type { NotificationSettings as Settings } from "@/lib/notifications/types";

type ToggleKey =
  | "notif_rest_timer"
  | "notif_pr"
  | "notif_reminder"
  | "notif_streak"
  | "notif_weekly";

const TOGGLES: { key: ToggleKey; label: string; note?: string }[] = [
  { key: "notif_pr", label: "Personal record celebration" },
  { key: "notif_rest_timer", label: "Rest timer", note: "Foreground only for now" },
  { key: "notif_reminder", label: "Workout reminder", note: "Coming soon" },
  { key: "notif_streak", label: "Streak protection", note: "Coming soon" },
  { key: "notif_weekly", label: "Weekly recap", note: "Coming soon" },
];

function Row({
  label,
  note,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  note?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className="flex items-center justify-between rounded-xl px-4 py-3"
      style={{ background: "var(--surface)", opacity: disabled ? 0.5 : 1 }}
    >
      <span>
        <span className="font-medium">{label}</span>
        {note ? (
          <span className="block text-xs" style={{ color: "var(--text-dim)" }}>
            {note}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-6 w-6"
        style={{ accentColor: "var(--accent)" }}
      />
    </label>
  );
}

export function NotificationSettings({ initial }: { initial: Settings }) {
  const [s, setS] = useState<Settings>(initial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function persist(next: Settings) {
    setS(next);
    startTransition(async () => {
      const res = await updateNotificationSettings({
        notif_master: next.notif_master,
        notif_rest_timer: next.notif_rest_timer,
        notif_reminder: next.notif_reminder,
        reminder_days: next.reminder_days,
        reminder_time: next.reminder_time,
        notif_streak: next.notif_streak,
        notif_pr: next.notif_pr,
        notif_weekly: next.notif_weekly,
        rest_timer_seconds: next.rest_timer_seconds,
      });
      if (res?.error) setError(res.error);
    });
  }

  function onMasterChange(on: boolean) {
    setError(null);
    if (on) {
      startTransition(async () => {
        const sub = await enablePush();
        if (!sub) {
          setError(
            "Could not enable notifications. Install the app to your home screen and allow notifications.",
          );
          return;
        }
        const saved = await saveSubscription(sub);
        if (saved?.error) {
          setError(saved.error);
          return;
        }
        persist({ ...s, notif_master: true });
      });
    } else {
      startTransition(async () => {
        const endpoint = await disablePush();
        if (endpoint) await removeSubscription(endpoint);
        persist({ ...s, notif_master: false });
      });
    }
  }

  return (
    <section>
      <h2 className="text-lg font-semibold mb-3">Notifications</h2>

      <Row
        label="Enable notifications"
        note="Requires installing the app to your home screen"
        checked={s.notif_master}
        onChange={onMasterChange}
        disabled={pending}
      />

      <div className="flex flex-col gap-2 mt-3">
        {TOGGLES.map((t) => (
          <Row
            key={t.key}
            label={t.label}
            note={t.note}
            checked={s[t.key]}
            disabled={!s.notif_master || pending}
            onChange={(v) => persist({ ...s, [t.key]: v })}
          />
        ))}
      </div>

      <label className="block text-xs mt-4" style={{ color: "var(--text-dim)" }}>
        Default rest timer (seconds)
        <input
          type="number"
          min={5}
          max={3600}
          value={s.rest_timer_seconds}
          onChange={(e) =>
            persist({ ...s, rest_timer_seconds: Number(e.target.value) })
          }
          className="w-full rounded-lg px-3 py-2 mt-1 outline-none"
          style={{ background: "var(--surface-2)", color: "var(--text)", minHeight: 44 }}
        />
      </label>

      {error ? (
        <p role="alert" className="text-sm mt-3" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
