"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { savePlannerDay } from "@/lib/planner/dayActions";
import { hidePlannerCategory } from "@/lib/planner/categoryActions";
import { PlannerCategoryAdd } from "@/components/PlannerCategoryAdd";
import type { PlannerDay } from "@/lib/planner/week";
import type { PlannerCategory } from "@/lib/planner/dayQueries";

// Logs or plans one day.
//
// SELECTION IS AN ORDERED ARRAY RATHER THAN A SET, because the order tapped is
// the order written and the order read back, so a day reads the way she built
// it instead of in whatever order the category list happens to sit in.
//
// NOTHING HERE REFUSES A COMBINATION. Rest beside a real workout is allowed on
// purpose: she chose that a day carries every label it needs and asked for no
// rule against any pairing, so there is no validation and no warning.
export function PlannerDaySheet({
  day,
  categories,
  initial,
  onDone,
}: {
  day: string;
  categories: PlannerCategory[];
  initial: PlannerDay | null;
  onDone: () => void;
}) {
  // Seeded from the day as it already stands, so saving a day that was opened
  // to change one label does not drop the rest of them.
  const [picked, setPicked] = useState<string[]>(initial?.categories ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Removing is behind a mode rather than a control on every chip. These are
  // tap targets used on every save, so a permanent remove button would sit a
  // destructive action a few pixels from an ordinary one.
  const [editing, setEditing] = useState(false);

  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  // Also drops it from the current selection, so a chip removed while it was
  // picked cannot be saved onto the day it was just taken off.
  async function remove(id: string) {
    setBusy(true);
    setError(null);
    const result = await hidePlannerCategory(id);
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPicked((prev) => prev.filter((p) => p !== id));
  }

  async function save() {
    setBusy(true);
    setError(null);
    const result = await savePlannerDay(day, picked);
    setBusy(false);
    // The sheet stays open on a failure, holding everything that was picked, so
    // a retry is one tap rather than a rebuild.
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onDone();
  }

  return (
    <Card className="px-4 py-4" style={{ borderRadius: "var(--radius-tile)" }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10.5px] uppercase tracking-[.11em]" style={{ color: "var(--text-dim)" }}>
          {editing ? "Tap a label to remove it" : "Labels"}
        </span>
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          className="px-2 text-[13px]"
          style={{ minHeight: 44, color: "var(--accent)" }}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const on = picked.includes(c.id);
          // ONE BUTTON WITH TWO MODES, NOT A BUTTON INSIDE A BUTTON. A remove
          // control nested in the chip would be invalid HTML and unreachable by
          // keyboard, so the chip itself becomes the remove control while
          // editing. The accessible name changes with it, because "Rest" and
          // "Remove Rest" are different actions and must not share a label.
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={editing ? undefined : on}
              aria-label={editing ? `Remove ${c.name}` : undefined}
              disabled={busy}
              onClick={() => (editing ? void remove(c.id) : toggle(c.id))}
              className="px-3.5 border text-[13px]"
              style={{
                minHeight: 44,
                borderRadius: "var(--radius-square)",
                background: editing ? "var(--surface)" : on ? "var(--accent-dim)" : "var(--surface)",
                borderColor: editing
                  ? "var(--trend-down)"
                  : on
                    ? "var(--accent)"
                    : "var(--surface-border)",
                color: editing ? "var(--trend-down)" : on ? "var(--accent)" : "var(--text)",
              }}
            >
              {editing ? `${c.name} ×` : c.name}
            </button>
          );
        })}
      </div>

      {/*
        Directly beneath the chips, because the moment a label she needs is
        missing is the moment she is looking at the ones that exist.
      */}
      <PlannerCategoryAdd />

      {/*
        ONE BUTTON, BECAUSE THE DATE ALREADY ANSWERS THE QUESTION THE SECOND ONE
        ASKED. A day that has arrived is a workout and a day still to come is a
        plan, so "Plan it" was asking the user to restate the calendar, and it
        made it possible to record a future day as trained. savePlannerDay
        derives it now, so there is one definition rather than one per surface.
      */}
      <div className="flex mt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save()}
          className="flex-1 font-medium"
          style={{
            minHeight: 44,
            borderRadius: "var(--radius-square)",
            background: "var(--accent)",
            color: "var(--on-accent)",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Log it
        </button>
      </div>

      {error ? (
        <p role="alert" className="text-xs mt-2" style={{ color: "var(--trend-down)" }}>
          {error}
        </p>
      ) : null}
    </Card>
  );
}
