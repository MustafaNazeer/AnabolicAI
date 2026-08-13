"use client";

import { useState, useTransition } from "react";
import { filterExercises } from "@/lib/routines/edit";
import { createExercise } from "@/lib/data/actions";
import type { Exercise } from "@/lib/data/types";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";

const GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core"];
const EQUIPMENT = [
  "Barbell",
  "Dumbbell",
  "Machine",
  "Cable",
  "Bodyweight",
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
      className="px-3 text-xs"
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

      <div className="flex flex-wrap gap-1.5 mb-1.5">
        {GROUPS.map((g) => (
          <Chip
            key={g}
            label={g}
            active={group === g}
            onToggle={() => setGroup(group === g ? null : g)}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {EQUIPMENT.map((eq) => (
          <Chip
            key={eq}
            label={eq}
            active={equipment === eq}
            onToggle={() => setEquipment(equipment === eq ? null : eq)}
          />
        ))}
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
            No exercises match those filters.
          </li>
        ) : null}
      </ul>
    </Card>
  );
}
