"use client";

import { useState, useTransition } from "react";
import { filterExercises } from "@/lib/routines/edit";
import { createExercise, updateExercise } from "@/lib/data/actions";
import type { Exercise } from "@/lib/data/types";
import { Plus, Pencil } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { GROUPS, EQUIPMENT } from "@/lib/data/vocabulary";
import { Chip } from "@/components/ui/Chip";
import { ExerciseForm } from "@/components/ExerciseForm";

export function ExercisePicker({
  library,
  onAdd,
  onCreated,
  onUpdated,
  takenIds,
}: {
  library: Exercise[];
  onAdd: (exercise: Exercise) => void;
  onCreated: (exercise: Exercise) => void;
  onUpdated: (exercise: Exercise) => void;
  takenIds: Set<string>;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<string | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Exercise | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

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

  function submitNew(name: string, group: string, eq: string) {
    setFormError(null);
    startTransition(async () => {
      const result = await createExercise(name, group, eq);
      if (result.exercise) {
        onCreated(result.exercise);
        setQuery("");
        setCreating(false);
        return;
      }
      // Stays open so the typed name and both chips survive the retry.
      setFormError(result.error ?? "Could not create exercise.");
    });
  }

  function submitEdit(name: string, group: string, eq: string) {
    const target = editing;
    if (!target) return;
    setFormError(null);
    startTransition(async () => {
      const result = await updateExercise(target.id, name, group, eq);
      if (result.exercise) {
        onUpdated(result.exercise);
        setEditing(null);
        return;
      }
      setFormError(result.error ?? "Could not save the exercise.");
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
          <li key={e.id} className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onAdd(e)}
              className="flex flex-1 items-center justify-between rounded-lg px-3 py-2 text-left"
              style={{ color: "var(--text)", minHeight: 44 }}
            >
              <span>{e.name}</span>
              <Plus size={16} aria-hidden style={{ color: "var(--accent)" }} />
            </button>
            {e.is_default ? null : (
              <button
                type="button"
                aria-label={`Edit ${e.name}`}
                onClick={() => {
                  setFormError(null);
                  setCreating(false);
                  setEditing(e);
                }}
                className="shrink-0 rounded-lg px-3"
                style={{ color: "var(--text-dim)", minWidth: 44, minHeight: 44 }}
              >
                <Pencil size={16} aria-hidden />
              </button>
            )}
          </li>
        ))}
        {showCreate && !creating ? (
          <li>
            <button
              type="button"
              onClick={() => {
                setFormError(null);
                setEditing(null);
                setCreating(true);
              }}
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

      {creating ? (
        <div className="mt-2">
          <ExerciseForm
            initialName={query.trim()}
            // The active filters are almost certainly the right answer: you
            // filtered, found nothing, and are now creating what was missing.
            initialGroup={group}
            initialEquipment={equipment}
            submitLabel="Create exercise"
            pending={pending}
            error={formError}
            onSubmit={submitNew}
            onCancel={() => {
              setCreating(false);
              setFormError(null);
            }}
          />
        </div>
      ) : null}

      {editing ? (
        <div className="mt-2">
          <ExerciseForm
            key={editing.id}
            initialName={editing.name}
            initialGroup={editing.muscle_group}
            initialEquipment={editing.equipment}
            submitLabel="Save"
            pending={pending}
            error={formError}
            onSubmit={submitEdit}
            onCancel={() => {
              setEditing(null);
              setFormError(null);
            }}
          />
        </div>
      ) : null}
    </Card>
  );
}
