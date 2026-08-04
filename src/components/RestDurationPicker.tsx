"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { describeDuration, parseTypedDuration } from "@/lib/workout/duration";

// Matches the reps and weight fields in ExerciseLogCard, so the two typed
// surfaces in a workout look and behave the same.
const fieldStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text)",
  minHeight: 44,
} as const;

const buttonStyle = {
  borderRadius: "var(--radius-square)",
  minWidth: 48,
  minHeight: 44,
} as const;

/**
 * Digits only, at most two. Filtering on the way in means an unusable value
 * cannot be typed at all, so there is no error state to design.
 */
function digitsOnly(value: string): string {
  return value.replace(/\D/g, "").slice(0, 2);
}

export function RestDurationPicker({
  seconds,
  onPick,
  onCancel,
}: {
  seconds: number;
  onPick: (seconds: number) => void;
  onCancel: () => void;
}) {
  // Seeded from the real value, so a two minute rest opens showing 2 and 0.
  // The caller's value is always already clamped, by clampRest on mount or by
  // parseTypedDuration on every later change.
  const [minutes, setMinutes] = useState(() => String(Math.floor(seconds / 60)));
  const [secs, setSecs] = useState(() => String(seconds % 60));

  const parsed = parseTypedDuration(minutes, secs);

  function commit() {
    // Both boxes empty means there is nothing to set, so this closes exactly
    // like Cancel rather than guessing at a value.
    if (parsed === null) onCancel();
    else onPick(parsed);
  }

  return (
    <div className="flex items-end gap-2 mt-3">
      <div
        role="group"
        aria-label="Rest duration"
        className="flex items-end gap-2 flex-1"
      >
        <label className="flex-1 text-xs" style={{ color: "var(--text-dim)" }}>
          Minutes
          <input
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(digitsOnly(e.target.value))}
            className="w-full px-3 py-2 mt-1 tabular-nums"
            style={fieldStyle}
          />
        </label>
        <label className="flex-1 text-xs" style={{ color: "var(--text-dim)" }}>
          Seconds
          <input
            inputMode="numeric"
            value={secs}
            onChange={(e) => setSecs(digitsOnly(e.target.value))}
            className="w-full px-3 py-2 mt-1 tabular-nums"
            style={fieldStyle}
          />
        </label>
      </div>
      <button
        type="button"
        onClick={commit}
        aria-label={
          parsed === null
            ? "Set duration"
            : `Set duration to ${describeDuration(parsed)}`
        }
        className="flex items-center justify-center"
        style={{
          ...buttonStyle,
          background: "var(--accent)",
          color: "var(--on-accent)",
        }}
      >
        <Check size={18} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onCancel}
        aria-label="Cancel duration change"
        className="flex items-center justify-center"
        style={{
          ...buttonStyle,
          background: "var(--surface-sunken)",
          border: "1px solid var(--surface-border)",
          color: "var(--text-dim)",
        }}
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}
