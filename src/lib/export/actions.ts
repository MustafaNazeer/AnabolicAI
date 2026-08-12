"use server";

import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/export/csv";
import { selectColumns, type Dataset } from "@/lib/export/columns";
import { getSetRows, getSessionRows } from "@/lib/export/queries";

// Annotated explicitly rather than inferred. An inferred union widens to
// { ok: boolean; error?: undefined } on the success arm, and a caller
// narrowing with "error" in result then gets string | undefined. That shipped
// as a real bug on 2026-08-09 and only tsc caught it.
export type ExportResult =
  | { ok: true; filename: string; csv: string }
  | { ok: false; error: string };

export type ExportInput = {
  dataset: Dataset;
  columns: string[];
  startDate: string;
  endDate: string;
  timeZone: string;
};

export async function exportCsv(input: ExportInput): Promise<ExportResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  // Validated before anything is read, so a rejected request costs no query.
  const selected = selectColumns(input.dataset, input.columns);
  if (!selected.ok) return { ok: false, error: selected.error };
  if (input.endDate < input.startDate) {
    return { ok: false, error: "The end date is before the start date." };
  }

  const rows =
    input.dataset === "sets"
      ? await getSetRows(input.startDate, input.endDate, input.timeZone)
      : await getSessionRows(input.startDate, input.endDate, input.timeZone);

  // An empty file with only headers reads as a broken export in Sheets rather
  // than as an empty range, so say so instead of producing one.
  if (rows.length === 0) {
    return { ok: false, error: `No ${input.dataset} in that range.` };
  }

  const csv = toCsv(
    selected.columns.map((c) => c.header),
    rows.map((row) => selected.columns.map((c) => c.value(row as never, input.timeZone))),
  );

  return {
    ok: true,
    filename: `onyx-${input.dataset}-${input.startDate}-to-${input.endDate}.csv`,
    csv,
  };
}
