// src/components/GoalCard.tsx
"use client";

import { useState, useTransition } from "react";
import { Target } from "lucide-react";
import { createGoal, updateGoal, deleteGoal } from "@/lib/goals/actions";
import { displayLbsToGo } from "@/lib/goals/progress";
import { ErrorRetry } from "@/components/ui/ErrorRetry";
import type { GoalWithProgress } from "@/lib/goals/types";

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function GoalCard(props: {
  exerciseId: string;
  active: GoalWithProgress | null;
  achieved: GoalWithProgress[];
}) {
  const { exerciseId, active, achieved } = props;
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [weight, setWeight] = useState(active ? String(active.targetWeight) : "");
  const [reps, setReps] = useState(active ? String(active.targetReps) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    setError(null);
    const w = Number(weight);
    const r = Number(reps);
    startTransition(async () => {
      const res = active
        ? await updateGoal(active.id, w, r)
        : await createGoal(exerciseId, w, r);
      if (res?.error) setError(res.error);
      else setEditing(false);
    });
  }

  function remove() {
    if (!active) return;
    startTransition(async () => {
      await deleteGoal(active.id);
    });
  }

  const showForm = editing;

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-semibold">Goal</h2>
      </div>

      <div
        className="px-4 py-3"
        style={{
          background: "var(--surface)",
          border: "1px solid var(--surface-border)",
          borderRadius: "var(--radius-tile)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
        }}
      >
        {showForm ? (
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              <label className="text-xs flex-1" style={{ color: "var(--text-dim)" }}>
                Weight (lbs)
                <input
                  type="number"
                  min={0}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
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
              <label className="text-xs flex-1" style={{ color: "var(--text-dim)" }}>
                Reps
                <input
                  type="number"
                  min={1}
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
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
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={pending}
                className="px-4 font-medium"
                style={{
                  minHeight: 44,
                  borderRadius: "var(--radius-square)",
                  background: "var(--accent)",
                  color: "var(--on-accent)",
                }}
              >
                Save goal
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditing(false);
                  setError(null);
                }}
                disabled={pending}
                className="px-4"
                style={{ minHeight: 44, color: "var(--text-dim)" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : active ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <span
                className="flex items-center justify-center"
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 9,
                  background: "var(--accent-dim)",
                  color: "var(--accent)",
                }}
              >
                <Target size={14} aria-hidden />
              </span>
              <span
                className="text-[15px] font-semibold"
                style={{ fontFamily: "var(--font-spectral)", color: "var(--text)" }}
              >
                {active.targetWeight} lbs x {active.targetReps}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 999,
                background: "var(--surface-sunken)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: `${Math.round(active.pct * 100)}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
            <p className="text-xs" style={{ color: "var(--text-dim)" }}>
              {active.reached
                ? "Reached"
                : `About ${displayLbsToGo(active.lbsToGo)} lbs to go`}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConfirmingDelete(false);
                  setWeight(String(active.targetWeight));
                  setReps(String(active.targetReps));
                  setEditing(true);
                }}
                disabled={pending}
                className="px-3 text-sm"
                style={{ minHeight: 44, color: "var(--text)" }}
              >
                Edit
              </button>
              {confirmingDelete ? (
                <>
                  <button
                    type="button"
                    onClick={remove}
                    disabled={pending}
                    className="px-3 text-sm"
                    style={{ minHeight: 44, color: "var(--text-dim)" }}
                  >
                    Confirm delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmingDelete(false)}
                    disabled={pending}
                    className="px-3 text-sm"
                    style={{ minHeight: 44, color: "var(--text-dim)" }}
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmingDelete(true)}
                  disabled={pending}
                  className="px-3 text-sm"
                  style={{ minHeight: 44, color: "var(--text-dim)" }}
                >
                  Delete
                </button>
              )}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setWeight("");
              setReps("");
              setEditing(true);
            }}
            className="px-4 font-medium"
            style={{
              minHeight: 44,
              borderRadius: "var(--radius-square)",
              background: "var(--accent)",
              color: "var(--on-accent)",
            }}
          >
            Set a goal
          </button>
        )}

        {error ? (
          <ErrorRetry message={error} pending={pending} onRetry={submit} />
        ) : null}
      </div>

      {achieved.length > 0 ? (
        <div className="mt-3">
          <p className="text-xs mb-2" style={{ color: "var(--text-dim)" }}>
            Achieved
          </p>
          <ul className="flex flex-col gap-2">
            {achieved.map((g) => (
              <li
                key={g.id}
                className="flex items-center justify-between px-3 py-2 text-sm"
                style={{
                  background: "var(--surface-sunken)",
                  border: "1px solid var(--surface-border)",
                  borderRadius: "var(--radius-tile)",
                  color: "var(--text)",
                }}
              >
                <span>
                  {g.targetWeight} lbs x {g.targetReps}
                </span>
                <span style={{ color: "var(--text-dim)" }}>
                  Reached {g.achievedAt ? shortDate(g.achievedAt) : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
