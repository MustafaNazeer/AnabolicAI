import type { Exercise } from "@/lib/data/types";

export function moveItem<T>(
  list: T[],
  index: number,
  direction: "up" | "down",
): T[] {
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) {
    return list;
  }
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export type ExerciseFilter = {
  query?: string;
  group?: string | null;
  equipment?: string | null;
};

// Three independent dimensions, all optional. A null or absent dimension is no
// filter at all, which is how the picker clears a chip. An exercise missing the
// field a dimension asks about never matches that dimension, because the app
// does not know the answer and guessing would be worse than omitting it.
export function filterExercises(
  list: Exercise[],
  options: ExerciseFilter,
): Exercise[] {
  const q = (options.query ?? "").trim().toLowerCase();
  const group = options.group ?? null;
  const equipment = options.equipment ?? null;
  return list.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q)) return false;
    if (group && e.muscle_group !== group) return false;
    if (equipment && e.equipment !== equipment) return false;
    return true;
  });
}
