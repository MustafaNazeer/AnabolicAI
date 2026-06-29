"use client";

import { useState, useTransition } from "react";
import { X, Check, Copy } from "lucide-react";
import { RIR_OPTIONS } from "@/lib/workout/rir";
import { logSet, deleteSet } from "@/lib/workout/actions";
import { lastSetForNumber } from "@/lib/workout/quickfill";
import type { LastSet, SessionExercise } from "@/lib/workout/types";
import { Card } from "@/components/ui/Card";
import { ErrorRetry } from "@/components/ui/ErrorRetry";

const fieldStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text)",
  minHeight: 44,
} as const;

export function ExerciseLogCard({
  sessionId,
  item,
  lastSets,
  onLogged,
}: {
  sessionId: string;
  item: SessionExercise;
  lastSets: LastSet[];
  onLogged: () => void;
}) {
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [rir, setRir] = useState(2);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const nextSetNumber = item.loggedSets.length + 1;
  const suggestion = lastSetForNumber(lastSets, nextSetNumber);

  function fillFromLast() {
    if (!suggestion) return;
    setWeight((w) => (w === "" ? String(suggestion.weight) : w));
    setReps((r) => (r === "" ? String(suggestion.reps) : r));
  }

  function log() {
    setError(null);
    const r = Number(reps);
    const w = Number(weight);
    startTransition(async () => {
      const result = await logSet(sessionId, item.exercise.id, nextSetNumber, r, w, rir);
      if (result?.error) {
        setError(result.error);
      } else {
        setReps("");
        setWeight("");
        onLogged();
      }
    });
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: "var(--text)" }}>
          {item.exercise.name}
        </h3>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>
          {item.defaultSets} sets
        </span>
      </div>
      {suggestion ? (
        <button
          type="button"
          onClick={fillFromLast}
          aria-label={`Fill set ${nextSetNumber} with last time, ${suggestion.weight} pounds for ${suggestion.reps} reps`}
          className="inline-flex items-center gap-1 text-xs mt-1 underline underline-offset-2"
          style={{ color: "var(--text-dim)", minHeight: 44 }}
        >
          <Copy size={12} aria-hidden />
          Last time: {suggestion.weight} lbs x {suggestion.reps}
        </button>
      ) : (
        <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
          No history yet
        </p>
      )}

      <ul className="flex flex-col gap-1 mt-3">
        {item.loggedSets.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between px-3 py-2 text-sm"
            style={{
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-square)",
            }}
          >
            <span>
              Set {s.set_number}: {s.weight} x {s.reps}
            </span>
            <form action={deleteSet.bind(null, s.id, sessionId)}>
              <button
                type="submit"
                aria-label={`Delete set ${s.set_number}`}
                style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
                className="flex items-center justify-center"
              >
                <X size={16} aria-hidden />
              </button>
            </form>
          </li>
        ))}
      </ul>

      <div className="flex items-end gap-2 mt-3">
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
        <button
          type="button"
          onClick={log}
          disabled={pending}
          aria-label="Log set"
          className="flex items-center justify-center disabled:opacity-60"
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

      {error ? (
        <ErrorRetry message={error} onRetry={log} pending={pending} />
      ) : null}
    </Card>
  );
}
