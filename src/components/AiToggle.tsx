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
  locked = false,
}: {
  label: string;
  description: string;
  initial: boolean;
  save: (enabled: boolean) => Promise<{ ok: true } | { error: string }>;
  approved?: boolean;
  // The features have been taken out of the interface by the master switch, so
  // this row has nothing left to govern until they are back.
  locked?: boolean;
}) {
  const [checked, setChecked] = useState(initial);
  const [busy, setBusy] = useState(false);
  const explanationId = useId();

  // Hidden wins over unapproved when both apply. Hidden is the state the user
  // chose a moment ago and can undo with the switch directly above, while the
  // approval notice would point them at something that is not in their way.
  const reason = locked
    ? "Turn Show AI features on to change this."
    : approved
      ? null
      : "This account is waiting to be approved.";

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
        {reason ? (
          <span
            id={explanationId}
            className="block text-xs"
            style={{ color: "var(--text-dim)" }}
          >
            {reason}
          </span>
        ) : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        // TWO LOCKS THAT POINT DIFFERENT WAYS, and the difference is the point.
        //
        // The approval lock is one directional, matching the three save actions
        // this row calls: each gates enabling and leaves disabling open, so an
        // account whose approval was revoked while a feature was on can still
        // withdraw that consent, since revoking approval deliberately does not
        // clear the consent columns. Locking both ways there would leave the
        // switch checked and frozen with nowhere in the app to turn it off.
        //
        // The hidden lock holds both ways, and that is safe for a reason which
        // does not apply to approval: the only three Anthropic call sites are
        // the three server actions, each reached by tapping a surface the master
        // switch has just removed. Nothing can be sent while the features are
        // hidden whatever these flags say, and the switch that restores them
        // sits directly above this row.
        disabled={busy || locked || (!approved && !checked)}
        onChange={(e) => void change(e.target.checked)}
        aria-label={label}
        aria-describedby={reason ? explanationId : undefined}
        className="h-6 w-6"
        style={{ accentColor: "var(--accent)" }}
      />
    </label>
  );
}
