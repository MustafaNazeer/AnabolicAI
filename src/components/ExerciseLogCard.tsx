"use client";

import { useState, useTransition } from "react";
import { X, Check } from "lucide-react";
import { RIR_OPTIONS } from "@/lib/workout/rir";
import { logSet, deleteSet } from "@/lib/workout/actions";
import type { LastSet, SessionExercise } from "@/lib/workout/types";

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
  const lastTop = lastSets[0];

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
    <div className="rounded-xl p-4" style={{ background: "var(--surface)" }}>
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{item.exercise.name}</h3>
        <span className="text-xs" style={{ color: "var(--text-dim)" }}>
          {item.defaultSets} sets
        </span>
      </div>
      <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
        {lastTop
          ? `Last time: ${lastTop.weight} lbs x ${lastTop.reps}`
          : "No history yet"}
      </p>

      <ul className="flex flex-col gap-1 mt-3">
        {item.loggedSets.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
            style={{ background: "var(--surface-2)" }}
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
            className="w-full rounded-lg px-3 py-2 mt-1 outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", minHeight: 44 }}
          />
        </label>
        <label className="flex-1 text-xs" style={{ color: "var(--text-dim)" }}>
          Reps
          <input
            inputMode="numeric"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="w-full rounded-lg px-3 py-2 mt-1 outline-none"
            style={{ background: "var(--surface-2)", color: "var(--text)", minHeight: 44 }}
          />
        </label>
        <button
          type="button"
          onClick={log}
          disabled={pending}
          aria-label="Log set"
          className="flex items-center justify-center rounded-lg disabled:opacity-60"
          style={{ background: "var(--accent)", color: "#08090b", minWidth: 48, minHeight: 44 }}
        >
          <Check size={18} aria-hidden />
        </button>
      </div>
      <label className="block text-xs mt-2" style={{ color: "var(--text-dim)" }}>
        How hard was it
        <select
          value={rir}
          onChange={(e) => setRir(Number(e.target.value))}
          className="w-full rounded-lg px-3 py-2 mt-1 outline-none"
          style={{ background: "var(--surface-2)", color: "var(--text)", minHeight: 44 }}
        >
          {RIR_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      {error ? (
        <p role="alert" className="text-sm mt-2" style={{ color: "var(--accent)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
