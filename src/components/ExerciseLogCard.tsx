"use client";

import { useState } from "react";
import { X, Check, Copy, Repeat } from "lucide-react";
import { RIR_OPTIONS } from "@/lib/workout/rir";
import { lastSetForNumber } from "@/lib/workout/quickfill";
import type { LastSet } from "@/lib/workout/types";
import type { LocalSet } from "@/lib/offline/store";
import { Card } from "@/components/ui/Card";

const fieldStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text)",
  minHeight: 44,
} as const;

export function ExerciseLogCard({
  exerciseName,
  defaultSets,
  loggedSets,
  lastSets,
  onLog,
  onDelete,
  role = "plain",
  originalName = null,
  onSwap,
  onUndoSwap,
}: {
  exerciseName: string;
  defaultSets: number;
  loggedSets: LocalSet[];
  lastSets: LastSet[];
  onLog: (input: { reps: number; weight: number; rir: number }) => void;
  onDelete: (setId: string) => void;
  // "swappedOutOriginal" is a read-only card kept on screen so sets logged
  // before the swap stay visible. It shows what was logged and nothing else.
  role?: "plain" | "replacement" | "swappedOutOriginal";
  originalName?: string | null;
  onSwap?: () => void;
  onUndoSwap?: () => void;
}) {
  const readOnly = role === "swappedOutOriginal";
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [rir, setRir] = useState(2);
  const [error, setError] = useState<string | null>(null);

  const nextSetNumber = loggedSets.length + 1;
  const suggestion = lastSetForNumber(lastSets, nextSetNumber);

  function fillFromLast() {
    if (!suggestion) return;
    setWeight((w) => (w === "" ? String(suggestion.weight) : w));
    setReps((r) => (r === "" ? String(suggestion.reps) : r));
  }

  function log() {
    const r = Number(reps);
    const w = Number(weight);
    if (!Number.isFinite(r) || r < 1) {
      setError("Reps must be at least 1.");
      return;
    }
    if (!Number.isFinite(w) || w < 0) {
      setError("Weight cannot be negative.");
      return;
    }
    setError(null);
    onLog({ reps: r, weight: w, rir });
    setReps("");
    setWeight("");
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: "var(--text)" }}>
          {exerciseName}
        </h3>
        <span className="flex items-center gap-1">
          {readOnly ? null : (
            <span className="text-xs" style={{ color: "var(--text-dim)" }}>
              {defaultSets} sets
            </span>
          )}
          {onSwap ? (
            <button
              type="button"
              onClick={onSwap}
              aria-label={`Swap ${exerciseName} for another exercise`}
              className="flex items-center justify-center"
              style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
            >
              <Repeat size={16} aria-hidden />
            </button>
          ) : null}
        </span>
      </div>

      {role === "replacement" && originalName ? (
        <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
          Swapped out {originalName}
        </p>
      ) : null}
      {readOnly ? (
        <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
          Swapped out
        </p>
      ) : null}
      {onUndoSwap ? (
        <button
          type="button"
          onClick={onUndoSwap}
          aria-label="Undo swap"
          className="text-xs underline underline-offset-2"
          style={{ color: "var(--text-dim)", minHeight: 44 }}
        >
          Undo swap
        </button>
      ) : null}
      {readOnly ? null : suggestion ? (
        <button
          type="button"
          onClick={fillFromLast}
          aria-label={`Fill set ${nextSetNumber} with last time, ${suggestion.reps} reps for ${suggestion.weight} pounds`}
          className="inline-flex items-center gap-1 text-xs mt-1 underline underline-offset-2"
          style={{ color: "var(--text-dim)", minHeight: 44 }}
        >
          <Copy size={12} aria-hidden />
          Last time: {suggestion.reps} for {suggestion.weight} lbs
        </button>
      ) : (
        <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
          No history yet
        </p>
      )}

      <ul className="flex flex-col gap-1 mt-3">
        {loggedSets.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between px-3 py-2 text-sm"
            style={{
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-square)",
            }}
          >
            <span className="flex items-center gap-2">
              {s.syncState === "pending" ? (
                <span
                  role="img"
                  aria-label="Not yet synced"
                  title="Not yet synced"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 9999,
                    background: "var(--accent)",
                    display: "inline-block",
                    flexShrink: 0,
                  }}
                />
              ) : null}
              Set {s.setNumber}: {s.reps} for {s.weight} lbs
            </span>
            <button
              type="button"
              onClick={() => onDelete(s.id)}
              aria-label={`Delete set ${s.setNumber}`}
              style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
              className="flex items-center justify-center"
            >
              <X size={16} aria-hidden />
            </button>
          </li>
        ))}
      </ul>

      {readOnly ? null : (
        <>
          <div className="flex items-end gap-2 mt-3">
            <label className="flex-1 text-xs" style={{ color: "var(--text-dim)" }}>
              Reps
              <input
                inputMode="numeric"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="w-full px-3 py-2 mt-1"
                style={fieldStyle}
              />
            </label>
            <label className="flex-1 text-xs" style={{ color: "var(--text-dim)" }}>
              Weight
              <input
                inputMode="decimal"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 mt-1"
                style={fieldStyle}
              />
            </label>
            <button
              type="button"
              onClick={log}
              aria-label="Log set"
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
          </div>
          <label className="block text-xs mt-2" style={{ color: "var(--text-dim)" }}>
            How hard was it
            <select
              value={rir}
              onChange={(e) => setRir(Number(e.target.value))}
              className="w-full px-3 py-2 mt-1"
              style={fieldStyle}
            >
              {RIR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </>
      )}

      {error ? (
        <p role="alert" className="text-xs mt-2" style={{ color: "var(--trend-down)" }}>
          {error}
        </p>
      ) : null}
    </Card>
  );
}
