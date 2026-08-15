"use client";

import { useId, useState } from "react";

// One consent row per AI feature, all rendered identically. Kept visually the
// same row as the notification settings rows, standalone so the AI section
// does not entangle NotificationSettings' save cycle.
export function AiToggle({
  label,
  description,
  initial,
  save,
  approved = true,
}: {
  label: string;
  description: string;
  initial: boolean;
  save: (enabled: boolean) => Promise<{ ok: true } | { error: string }>;
  approved?: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  const [busy, setBusy] = useState(false);
  const explanationId = useId();

  async function change(next: boolean) {
    setChecked(next);
    setBusy(true);
    const result = await save(next);
    setBusy(false);
    if ("error" in result) setChecked(!next);
  }

  return (
    <label
      className="flex items-center justify-between px-4 py-3"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--surface-border)",
        borderRadius: "var(--radius-tile)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        opacity: busy ? 0.5 : 1,
      }}
    >
      <span>
        <span className="font-medium" style={{ color: "var(--text)" }}>
          {label}
        </span>
        <span className="block text-xs" style={{ color: "var(--text-dim)" }}>
          {description}
        </span>
        {approved ? null : (
          <span
            id={explanationId}
            className="block text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            This account is waiting to be approved.
          </span>
        )}
      </span>
      <input
        type="checkbox"
        checked={checked}
        // The lock only points one way, matching the three save actions this
        // row calls. Each of them gates enabling and leaves disabling open, so
        // that an account whose approval was revoked while a feature was on can
        // still withdraw that consent: revoking approval deliberately does not
        // clear the consent columns. Disabling the row outright would leave the
        // switch checked and frozen, with nowhere in the app to turn it off.
        disabled={busy || (!approved && !checked)}
        onChange={(e) => void change(e.target.checked)}
        aria-label={label}
        aria-describedby={approved ? undefined : explanationId}
        className="h-6 w-6"
        style={{ accentColor: "var(--accent)" }}
      />
    </label>
  );
}
