"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { savePlannerDay } from "@/lib/planner/dayActions";
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

  function toggle(id: string) {
    setPicked((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    );
  }

  async function save(done: boolean) {
    setBusy(true);
    setError(null);
    const result = await savePlannerDay(day, picked, done);
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
      <div className="flex flex-wrap gap-2">
        {categories.map((c) => {
          const on = picked.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.id)}
              className="px-3.5 border text-[13px]"
              style={{
                minHeight: 44,
                borderRadius: "var(--radius-square)",
                background: on ? "var(--accent-dim)" : "var(--surface)",
                borderColor: on ? "var(--accent)" : "var(--surface-border)",
                color: on ? "var(--accent)" : "var(--text)",
              }}
            >
              {c.name}
            </button>
          );
        })}
      </div>

      {/*
        Two actions rather than one with a switch beside it. The difference
        between logging and planning is the whole of what "done" means, and a
        button that says which one it is cannot be misread the way a checkbox
        left in its default state can.
      */}
      <div className="flex gap-2 mt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(true)}
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
        <button
          type="button"
          disabled={busy}
          onClick={() => void save(false)}
          className="flex-1 border font-medium"
          style={{
            minHeight: 44,
            borderRadius: "var(--radius-square)",
            background: "var(--surface)",
            borderColor: "var(--surface-border)",
            color: "var(--text)",
            opacity: busy ? 0.6 : 1,
          }}
        >
          Plan it
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
