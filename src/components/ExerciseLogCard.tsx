"use client";

import { useState } from "react";
import { X, Check, Copy, Repeat } from "lucide-react";
import { parseRir, rirSuffix } from "@/lib/workout/rir";
import { lastSetForNumber } from "@/lib/workout/quickfill";
import type { LastSet } from "@/lib/workout/types";
import type { LocalSet } from "@/lib/offline/store";
import { pluralize } from "@/lib/format/plural";
import { viewTransitionName } from "@/lib/motion/viewTransitionName";
import { Card } from "@/components/ui/Card";
import { QuickEntry } from "@/components/QuickEntry";

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
  onEdit,
  aiEnabled,
  onAiEnabled,
}: {
  exerciseName: string;
  defaultSets: number;
  loggedSets: LocalSet[];
  lastSets: LastSet[];
  onLog: (input: {
    reps: number;
    weight: number;
    rirLow: number | null;
    rirHigh: number | null;
  }) => void;
  onDelete: (setId: string) => void;
  // "swappedOutOriginal" is a read-only card kept on screen so sets logged
  // before the swap stay visible. It shows what was logged and nothing else.
  role?: "plain" | "replacement" | "swappedOutOriginal";
  originalName?: string | null;
  onSwap?: () => void;
  onUndoSwap?: () => void;
  onEdit?: (
    setId: string,
    input: {
      reps: number;
      weight: number;
      rirLow: number | null;
      rirHigh: number | null;
    },
  ) => void;
  // Both are absent on the orphan "Also logged this session" cards, which is
  // what keeps quick entry off a card that cannot be logged to.
  aiEnabled?: boolean;
  onAiEnabled?: () => void;
}) {
  const readOnly = role === "swappedOutOriginal";
  const [reps, setReps] = useState("");
  const [weight, setWeight] = useState("");
  const [rirLow, setRirLow] = useState("");
  const [rirHigh, setRirHigh] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nextSetNumber = loggedSets.length + 1;
  const suggestion = lastSetForNumber(lastSets, nextSetNumber);

  // A zero target must never count as reached. The "Also logged this session"
  // cards pass defaultSets={0}, and treating that as finished would make them
  // unloggable the moment they stopped being read only.
  const atTarget = defaultSets > 0 && loggedSets.length >= defaultSets;
  const [extraSets, setExtraSets] = useState(false);

  // Adjusting state during render rather than from an effect. This is React's
  // documented pattern for deriving from a changed prop, and it avoids the
  // cascading re-render that calling setState inside an effect body causes.
  // Dropping back under the target clears the latch, so the collapse returns
  // instead of staying off for the rest of the session.
  const belowTarget = loggedSets.length < defaultSets;
  const [wasBelowTarget, setWasBelowTarget] = useState(belowTarget);
  if (belowTarget !== wasBelowTarget) {
    setWasBelowTarget(belowTarget);
    if (belowTarget) setExtraSets(false);
  }

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<{
    reps: string;
    weight: string;
    rirLow: string;
    rirHigh: string;
  } | null>(null);

  function clearEditing() {
    setReps(draft?.reps ?? "");
    setWeight(draft?.weight ?? "");
    setRirLow(draft?.rirLow ?? "");
    setRirHigh(draft?.rirHigh ?? "");
    setDraft(null);
    setEditingId(null);
    setError(null);
  }

  // The set being edited was deleted, so there is nothing left to save into.
  // Adjusted during render for the same reason as the latch above, and it
  // converges because clearing editingId makes this false on the next pass.
  if (editingId !== null && !loggedSets.some((s) => s.id === editingId)) {
    clearEditing();
  }

  const showInputs = !atTarget || extraSets || editingId !== null;

  function fillFromLast() {
    if (!suggestion) return;
    setWeight((w) => (w === "" ? String(suggestion.weight) : w));
    setReps((r) => (r === "" ? String(suggestion.reps) : r));
    // The two RIR boxes are one value, so they fill as a pair and only when
    // neither has been typed into. A single recorded value fills the lower box
    // alone, which is what a person types; parseRir collapses it on log.
    if (suggestion.rirLow === null) return;
    if (rirLow !== "" || rirHigh !== "") return;
    setRirLow(String(suggestion.rirLow));
    if (suggestion.rirHigh !== null && suggestion.rirHigh !== suggestion.rirLow) {
      setRirHigh(String(suggestion.rirHigh));
    }
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
    const parsed = parseRir(rirLow, rirHigh);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onLog({ reps: r, weight: w, ...parsed });
    setReps("");
    setWeight("");
    setRirLow("");
    setRirHigh("");
  }

  function startEdit(s: LocalSet) {
    // Stash whatever is part way typed so tapping a set never eats it. Only on
    // the way in, so hopping between two sets does not overwrite the stash.
    if (editingId === null) setDraft({ reps, weight, rirLow, rirHigh });
    setEditingId(s.id);
    setReps(String(s.reps));
    setWeight(String(s.weight));
    setRirLow(s.rirLow === null ? "" : String(s.rirLow));
    setRirHigh(
      s.rirHigh === null || s.rirHigh === s.rirLow ? "" : String(s.rirHigh),
    );
    setError(null);
  }

  function saveEdit() {
    if (editingId === null) return;
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
    const parsed = parseRir(rirLow, rirHigh);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    onEdit?.(editingId, { reps: r, weight: w, ...parsed });
    clearEditing();
  }

  // Shared by the plain and the tappable arms of a logged row so the two
  // cannot drift apart.
  function rowContent(s: LocalSet) {
    return (
      <>
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
        {rirSuffix(s.rirLow, s.rirHigh)}
      </>
    );
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
              {pluralize(defaultSets, "set")}
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
          aria-label={`Fill set ${nextSetNumber} with last time, ${suggestion.reps} reps for ${suggestion.weight} pounds${rirSuffix(suggestion.rirLow, suggestion.rirHigh)}`}
          className="inline-flex items-center gap-1 text-xs mt-1 underline underline-offset-2"
          style={{ color: "var(--text-dim)", minHeight: 44 }}
        >
          <Copy size={12} aria-hidden />
          Last time: {suggestion.reps} for {suggestion.weight} lbs
          {rirSuffix(suggestion.rirLow, suggestion.rirHigh)}
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
            className="onyx-lift flex items-center justify-between px-3 py-2 text-sm"
            style={{
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-square)",
              viewTransitionName: viewTransitionName("set", s.id),
            }}
          >
            {readOnly || !onEdit ? (
              <span className="flex items-center gap-2">{rowContent(s)}</span>
            ) : (
              <button
                type="button"
                onClick={() => startEdit(s)}
                aria-label={`Edit set ${s.setNumber}, ${s.reps} for ${s.weight} lbs${rirSuffix(s.rirLow, s.rirHigh)}`}
                className="flex items-center gap-2 text-left"
                style={{ color: "var(--text)", minHeight: 44 }}
              >
                {rowContent(s)}
              </button>
            )}
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

      {!readOnly && aiEnabled !== undefined && onAiEnabled ? (
        <div className="mt-3">
          <QuickEntry
            aiEnabled={aiEnabled}
            onAiEnabled={onAiEnabled}
            onLog={onLog}
          />
        </div>
      ) : null}

      {readOnly ? null : !showInputs ? (
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs" style={{ color: "var(--text-dim)" }}>
            Done
          </span>
          <button
            type="button"
            onClick={() => setExtraSets(true)}
            className="text-xs underline underline-offset-2"
            style={{ color: "var(--text-dim)", minHeight: 44 }}
          >
            Add another set
          </button>
        </div>
      ) : (
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
            <div
              role="group"
              aria-label="Reps in reserve"
              className="flex items-end gap-2"
              style={{ flex: 2 }}
            >
              <label className="flex-1 text-xs" style={{ color: "var(--text-dim)" }}>
                RIR
                <input
                  inputMode="numeric"
                  value={rirLow}
                  onChange={(e) => setRirLow(e.target.value)}
                  className="w-full px-3 py-2 mt-1"
                  style={fieldStyle}
                />
              </label>
              <label className="flex-1 text-xs" style={{ color: "var(--text-dim)" }}>
                to
                <input
                  inputMode="numeric"
                  aria-label="to, highest reps in reserve"
                  value={rirHigh}
                  onChange={(e) => setRirHigh(e.target.value)}
                  className="w-full px-3 py-2 mt-1"
                  style={fieldStyle}
                />
              </label>
            </div>
            {editingId === null ? (
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
            ) : (
              <>
                <button
                  type="button"
                  onClick={saveEdit}
                  aria-label="Save set"
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
                  onClick={clearEditing}
                  aria-label="Cancel edit"
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
              </>
            )}
          </div>
          {editingId !== null ? (
            <p className="text-xs mt-2" style={{ color: "var(--text-dim)" }}>
              Editing set{" "}
              {loggedSets.find((s) => s.id === editingId)?.setNumber}
            </p>
          ) : null}
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
