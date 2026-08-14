"use client";

import { useState, useTransition } from "react";
import { filterExercises } from "@/lib/routines/edit";
import { createExercise } from "@/lib/data/actions";
import type { Exercise } from "@/lib/data/types";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";

export const GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core"];
// Ordered by how broadly useful each value is, not by the CHECK constraint's
// order (which is alphabetical-ish and irrelevant here). Bodyweight moves up
// so it lands inside the roughly four chips that fit a 390px viewport without
// swiping, since it is arguably the most useful value for anyone training at
// home. Other stays last: it is the catch-all with the fewest rows behind it.
export const EQUIPMENT = [
  "Barbell",
  "Dumbbell",
  "Bodyweight",
  "Machine",
  "Cable",
  "Other",
];

// A chip is a toggle, so it carries aria-pressed rather than relying on colour
// alone to say it is active. Tapping the active chip clears its dimension.
function Chip({
  label,
  active,
  onToggle,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className="px-3 text-xs shrink-0"
      style={{
        minHeight: 44,
        background: active ? "var(--accent)" : "var(--surface-sunken)",
        border: `1px solid ${active ? "var(--accent)" : "var(--surface-border)"}`,
        borderRadius: "var(--radius-square)",
        color: active ? "var(--on-accent)" : "var(--text-dim)",
      }}
    >
      {label}
    </button>
  );
}

export function ExercisePicker({
  library,
  onAdd,
  onCreated,
  takenIds,
}: {
  library: Exercise[];
  onAdd: (exercise: Exercise) => void;
  onCreated: (exercise: Exercise) => void;
  takenIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const results = filterExercises(library, { query, group, equipment }).filter(
    (e) => !takenIds.has(e.id),
  );
  const showCreate =
    query.trim().length > 0 &&
    !library.some((e) => e.name.toLowerCase() === query.trim().toLowerCase());

  // A chip can hide the very match the query is asking for. Only worth
  // saying when a query is actually typed: an empty query plus an active
  // chip is ordinary browsing, not a search coming up short. Reuses
  // filterExercises with the chips left out, so the check never
  // reimplements filtering.
  const filtersHideMatches =
    (group !== null || equipment !== null) &&
    query.trim().length > 0 &&
    results.length === 0 &&
    filterExercises(library, { query }).some((e) => !takenIds.has(e.id));

  function create() {
    const name = query.trim();
    startTransition(async () => {
      const result = await createExercise(name, null);
      if (result.exercise) {
        onCreated(result.exercise);
        setQuery("");
      }
    });
  }

  return (
    <Card className="p-3" style={{ borderRadius: "var(--radius-tile)" }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search or add an exercise"
        className="w-full px-3 py-2 mb-2"
        style={{
          background: "var(--surface-sunken)",
          border: "1px solid var(--surface-border)",
          borderRadius: "var(--radius-square)",
          color: "var(--text)",
          minHeight: 44,
        }}
      />

      <div className="flex flex-col gap-1.5 mb-2">
        <div
          role="group"
          aria-label="Muscle group"
          className="flex gap-1.5 overflow-x-auto py-1"
        >
          {GROUPS.map((g) => (
            <Chip
              key={g}
              label={g}
              active={group === g}
              onToggle={() => setGroup(group === g ? null : g)}
            />
          ))}
        </div>
        <div
          role="group"
          aria-label="Equipment"
          className="flex gap-1.5 overflow-x-auto py-1"
        >
          {EQUIPMENT.map((eq) => (
            <Chip
              key={eq}
              label={eq}
              active={equipment === eq}
              onToggle={() => setEquipment(equipment === eq ? null : eq)}
            />
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-1 max-h-60 overflow-y-auto">
        {results.map((e) => (
          <li key={e.id}>
            <button
              type="button"
              onClick={() => onAdd(e)}
              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left"
              style={{ color: "var(--text)", minHeight: 44 }}
            >
              <span>{e.name}</span>
              <Plus size={16} aria-hidden style={{ color: "var(--accent)" }} />
            </button>
          </li>
        ))}
        {showCreate ? (
          <li>
            <button
              type="button"
              onClick={create}
              disabled={pending}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left disabled:opacity-60"
              style={{ color: "var(--accent)", minHeight: 44 }}
            >
              <Plus size={16} aria-hidden />
              Create &quot;{query.trim()}&quot;
            </button>
          </li>
        ) : null}
        {results.length === 0 && !showCreate ? (
          <li className="px-3 py-2 text-sm" style={{ color: "var(--text-dim)" }}>
            {filtersHideMatches
              ? "No exercises match. Tap the active filter to clear it."
              : "No exercises match."}
          </li>
        ) : null}
        {showCreate && filtersHideMatches ? (
          <li className="px-3 py-2 text-sm" style={{ color: "var(--text-dim)" }}>
            Tap the active filter to clear it.
          </li>
        ) : null}
      </ul>
    </Card>
  );
}
