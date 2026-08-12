import { estimatedOneRepMax, setVolume } from "@/lib/progress/strength";
import { dateKeyInZone } from "@/lib/progress/matrix";

export type Dataset = "sets" | "sessions";

// `date` is the session's completed_at. A set belongs to a session, and the
// Progress screen already keys off completed_at, so using it for both
// datasets means "sets in August" and "sessions in August" cannot disagree.
export type SetRow = {
  date: string;
  routineName: string;
  exerciseName: string;
  setNumber: number;
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};

export type SessionRow = {
  date: string;
  routineName: string;
  totalSets: number;
  totalVolume: number;
};

export type Column<Row> = {
  key: string;
  header: string;
  value: (row: Row, timeZone: string) => string;
};

// Both ends are set together or both are null, per SPEC.md's data model, so
// checking rirLow alone is sufficient. A single value stores the same number
// in each and reads back as one number rather than "2-2".
function rirText(low: number | null, high: number | null): string {
  if (low === null || high === null) return "";
  return low === high ? String(low) : `${low}-${high}`;
}

export const SET_COLUMNS: Column<SetRow>[] = [
  { key: "date", header: "Date", value: (r, tz) => dateKeyInZone(r.date, tz) },
  { key: "routine", header: "Routine", value: (r) => r.routineName },
  { key: "exercise", header: "Exercise", value: (r) => r.exerciseName },
  { key: "setNumber", header: "Set", value: (r) => String(r.setNumber) },
  { key: "reps", header: "Reps", value: (r) => String(r.reps) },
  { key: "weight", header: "Weight (lbs)", value: (r) => String(r.weight) },
  { key: "rir", header: "RIR", value: (r) => rirText(r.rirLow, r.rirHigh) },
  {
    key: "e1rm",
    header: "Estimated 1RM",
    value: (r) => String(estimatedOneRepMax(r.weight, r.reps)),
  },
  { key: "volume", header: "Volume", value: (r) => String(setVolume(r.weight, r.reps)) },
];

// "Total sets" rather than "Sets", deliberately. "Sets" is also the label of
// the dataset radio, and a checkbox sharing that accessible name makes
// getByLabelText("Sets") ambiguous in the panel tests, which is the kind of
// collision that makes a test pass for the wrong reason. It reads better in a
// spreadsheet too.
export const SESSION_COLUMNS: Column<SessionRow>[] = [
  { key: "date", header: "Date", value: (r, tz) => dateKeyInZone(r.date, tz) },
  { key: "routine", header: "Routine", value: (r) => r.routineName },
  { key: "totalSets", header: "Total sets", value: (r) => String(r.totalSets) },
  { key: "totalVolume", header: "Total volume", value: (r) => String(r.totalVolume) },
];

export function columnsFor(dataset: Dataset): Column<SetRow>[] | Column<SessionRow>[] {
  return dataset === "sets" ? SET_COLUMNS : SESSION_COLUMNS;
}

// The catalogue is the only source of truth for what may be exported. The
// client sends keys, so this is what stops an arbitrary string reaching a
// query. Required rather than defensive, the same reasoning that made
// validate.ts own every numeric bound during the quick entry work.
export function selectColumns(
  dataset: Dataset,
  keys: string[],
): { ok: true; columns: Column<never>[] } | { ok: false; error: string } {
  if (keys.length === 0) return { ok: false, error: "Choose at least one column." };
  // Column<never> erases the row type so one call site can serve both
  // datasets. The double cast is deliberate: a union of two Column arrays does
  // not overlap Column<never>[] enough for a direct assertion. The row type is
  // re-supplied at the call site, which is the only place that knows it.
  const catalogue = columnsFor(dataset) as unknown as Column<never>[];
  for (const key of keys) {
    if (!catalogue.some((c) => c.key === key)) {
      return { ok: false, error: `Unknown column: ${key}` };
    }
  }
  // Catalogue order, not tick order, so the same selection always produces the
  // same header row and a spreadsheet set up once can be refilled later.
  return { ok: true, columns: catalogue.filter((c) => keys.includes(c.key)) };
}
