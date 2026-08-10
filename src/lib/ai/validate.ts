import {
  MAX_PARSED_SETS,
  MAX_QUICK_ENTRY_CHARS,
  type ParsedSet,
} from "@/lib/ai/schema";

export function validateQuickEntryText(
  raw: string,
): { ok: true; text: string } | { ok: false } {
  const text = raw.trim();
  if (text.length === 0 || text.length > MAX_QUICK_ENTRY_CHARS)
    return { ok: false };
  return { ok: true, text };
}

// Mirrors the predicates logSet enforces in src/lib/workout/actions.ts, so a
// confirmed preview row can never be rejected by the server it syncs to.
function validSet(s: ParsedSet): boolean {
  if (!Number.isFinite(s.reps) || s.reps < 1) return false;
  if (!Number.isFinite(s.weight) || s.weight < 0) return false;
  if (
    s.rirLow !== null &&
    (!Number.isInteger(s.rirLow) || s.rirLow < 0 || s.rirLow > 5)
  )
    return false;
  if (
    s.rirHigh !== null &&
    (!Number.isInteger(s.rirHigh) || s.rirHigh < 0 || s.rirHigh > 5)
  )
    return false;
  if (s.rirLow !== null && s.rirHigh !== null && s.rirLow > s.rirHigh)
    return false;
  if ((s.rirLow === null) !== (s.rirHigh === null)) return false;
  return true;
}

function asParsedSet(item: unknown): ParsedSet | null {
  if (typeof item !== "object" || item === null) return null;
  const o = item as Record<string, unknown>;
  const num = (v: unknown) => typeof v === "number";
  const numOrNull = (v: unknown) => v === null || typeof v === "number";
  if (
    !num(o.reps) ||
    !num(o.weight) ||
    !numOrNull(o.rirLow) ||
    !numOrNull(o.rirHigh)
  )
    return null;
  return {
    reps: o.reps as number,
    weight: o.weight as number,
    rirLow: o.rirLow as number | null,
    rirHigh: o.rirHigh as number | null,
  };
}

// null means unusable, and an empty set list is unusable by definition: the
// caller shows "couldn't read that" rather than an empty preview.
export function validateParsedSets(value: unknown): ParsedSet[] | null {
  if (typeof value !== "object" || value === null) return null;
  const sets = (value as { sets?: unknown }).sets;
  if (!Array.isArray(sets)) return null;
  if (sets.length < 1 || sets.length > MAX_PARSED_SETS) return null;
  const out: ParsedSet[] = [];
  for (const item of sets) {
    const parsed = asParsedSet(item);
    if (!parsed || !validSet(parsed)) return null;
    out.push(parsed);
  }
  return out;
}
