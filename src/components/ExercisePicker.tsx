"use client";

import { useState, useTransition } from "react";
import { filterExercises } from "@/lib/routines/edit";
import { createExercise } from "@/lib/data/actions";
import type { Exercise } from "@/lib/data/types";
import { Plus } from "lucide-react";
import { Card } from "@/components/ui/Card";

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
  const [pending, startTransition] = useTransition();
  const results = filterExercises(library, { query }).filter(
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
      </ul>
    </Card>
  );
}
