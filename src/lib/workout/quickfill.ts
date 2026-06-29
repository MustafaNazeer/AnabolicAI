import type { LastSet } from "@/lib/workout/types";

export function lastSetForNumber(
  lastSets: LastSet[],
  setNumber: number,
): LastSet | undefined {
  if (lastSets.length === 0) return undefined;
  const exact = lastSets.find((s) => s.set_number === setNumber);
  if (exact) return exact;
  return lastSets.reduce((highest, s) =>
    s.set_number > highest.set_number ? s : highest,
  );
}
