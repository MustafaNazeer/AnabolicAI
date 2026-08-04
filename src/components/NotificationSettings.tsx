"use client";

import { useState, useTransition } from "react";
import {
  saveSubscription,
  removeSubscription,
  updateNotificationSettings,
} from "@/lib/notifications/actions";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import { enablePush, disablePush } from "@/lib/notifications/subscribe";
import { DAY_SHORT } from "@/lib/notifications/schedule";
import type { NotificationSettings as Settings } from "@/lib/notifications/types";

type ToggleKey =
  | "notif_rest_timer"
  | "notif_rest_push"
  | "notif_pr"
  | "notif_reminder"
  | "notif_streak"
  | "notif_weekly"
  | "notif_goal"
  | "notif_unfinished";

const TOGGLES: { key: ToggleKey; label: string; note?: string }[] = [
  // Distinct from the "Sound" row beside the default duration, which is a
  // local beep while the app is open and is deliberately ungated. The note is
  // what tells the two apart on screen.
  {
    key: "notif_rest_push",
    label: "Rest timer",
    note: "When a rest ends, even if the app is closed",
  },
  { key: "notif_pr", label: "Personal record celebration" },
  { key: "notif_reminder", label: "Workout reminder" },
  { key: "notif_streak", label: "Streak protection" },
  { key: "notif_weekly", label: "Weekly recap" },
  { key: "notif_goal", label: "Goal progress" },
  { key: "notif_unfinished", label: "Unfinished workout" },
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
      className="flex items-center justify-between px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-tile)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span>
        <span className="font-medium" style={{ color: "var(--text)" }}>
          {label}
        </span>
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
        notif_rest_push: next.notif_rest_push,
        notif_reminder: next.notif_reminder,
        reminder_days: next.reminder_days,
        reminder_time: next.reminder_time,
        notif_streak: next.notif_streak,
        notif_pr: next.notif_pr,
        notif_weekly: next.notif_weekly,
        notif_goal: next.notif_goal,
        notif_unfinished: next.notif_unfinished,
        rest_timer_seconds: next.rest_timer_seconds,
      });
      if (res?.error) setError(res.error);
    });
  }

  const selectedDays = new Set(
    (s.reminder_days ?? "")
      .split(",")
      .map((d) => d.trim())
      .filter(Boolean),
  );

  function toggleDay(day: string) {
    const next = new Set(selectedDays);
    if (next.has(day)) next.delete(day);
    else next.add(day);
    const ordered = DAY_SHORT.filter((d) => next.has(d)).join(",");
    persist({ ...s, reminder_days: ordered || null });
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
      <h2 className="text-lg font-semibold mb-3" style={{ color: "var(--text)" }}>
        Notifications
      </h2>

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

      {s.notif_master && s.notif_reminder ? (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
            Reminder days
          </p>
          <div className="flex gap-2 flex-wrap">
            {DAY_SHORT.map((d) => {
              const on = selectedDays.has(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  disabled={pending}
                  className="px-3 capitalize"
                  style={{
                    minHeight: 44,
                    minWidth: 44,
                    borderRadius: "var(--radius-square)",
                    border: "1px solid var(--surface-border)",
                    background: on ? "var(--accent)" : "var(--surface-sunken)",
                    color: on ? "var(--on-accent)" : "var(--text)",
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>
            Reminders arrive each morning on the days you pick.
          </p>
        </div>
      ) : null}

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
          className="w-full px-3 py-2 mt-1"
          style={{
            background: "var(--surface-sunken)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-square)",
            color: "var(--text)",
            minHeight: 44,
          }}
        />
      </label>

      {/* Not gated on notif_master. This is a local sound, not a push, so
          requiring notification permission to control it would be the wrong
          gate. */}
      <div className="mt-3">
        <Row
          label="Sound"
          note="When a rest ends, while the app is open"
          checked={s.notif_rest_timer}
          disabled={pending}
          onChange={(v) => persist({ ...s, notif_rest_timer: v })}
        />
      </div>

      {error ? (
        <ErrorRetry
          message={error}
          pending={pending}
          onRetry={() => onMasterChange(true)}
        />
      ) : null}
    </section>
  );
}
