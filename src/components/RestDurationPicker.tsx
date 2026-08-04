"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import {
  clampRest,
  describeDuration,
  MAX_REST_SECONDS,
  SECOND_STEP,
} from "@/lib/workout/duration";

const MAX_MINUTES = MAX_REST_SECONDS / 60;

const columnStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text)",
  minWidth: 64,
  minHeight: 44,
  // The touch affordance. Scrolling is a nicety layered on a control that is
  // fully usable from the keyboard, never the mechanism.
  scrollSnapType: "y mandatory",
  overflowY: "auto",
  maxHeight: 132,
} as const;

function Column({
  label,
  value,
  max,
  step,
  valueText,
  onChange,
  format,
}: {
  label: string;
  value: number;
  max: number;
  step: number;
  valueText: string;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  const options: number[] = [];
  for (let v = 0; v <= max; v += step) options.push(v);

  return (
    <div
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuetext={valueText}
      className="flex flex-col items-center text-center tabular-nums"
      style={columnStyle}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(max, value + step));
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(0, value - step));
        } else if (e.key === "Home") {
          e.preventDefault();
          onChange(0);
        } else if (e.key === "End") {
          e.preventDefault();
          onChange(max);
        }
      }}
    >
      {options.map((v) => (
        <span
          key={v}
          aria-hidden
          className="py-2 w-full"
          style={{
            scrollSnapAlign: "center",
            opacity: v === value ? 1 : 0.35,
            fontWeight: v === value ? 600 : 400,
          }}
        >
          {format(v)}
        </span>
      ))}
    </div>
  );
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
  const start = clampRest(seconds);
  const [minutes, setMinutes] = useState(Math.floor(start / 60));
  const [secs, setSecs] = useState(start % 60);

  const total = minutes * 60 + secs;
  const spoken = describeDuration(total);

  return (
    <div className="flex items-center gap-3 mt-3">
      <div
        role="group"
        aria-label="Rest duration"
        className="flex items-center gap-2"
      >
        <Column
          label="Minutes"
          value={minutes}
          max={MAX_MINUTES}
          step={1}
          valueText={spoken}
          onChange={setMinutes}
          format={(v) => String(v)}
        />
        <span aria-hidden style={{ color: "var(--text-dim)" }}>
          :
        </span>
        <Column
          label="Seconds"
          value={secs}
          max={60 - SECOND_STEP}
          step={SECOND_STEP}
          valueText={spoken}
          onChange={setSecs}
          format={(v) => String(v).padStart(2, "0")}
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPick(clampRest(total))}
          aria-label="Set duration"
          className="flex items-center justify-center"
          style={{
            background: "var(--accent)",
            color: "var(--on-accent)",
            borderRadius: "var(--radius-square)",
            minWidth: 48,
            minHeight: 44,
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
            background: "var(--surface-sunken)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-square)",
            color: "var(--text-dim)",
            minWidth: 48,
            minHeight: 44,
          }}
        >
          <X size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}
