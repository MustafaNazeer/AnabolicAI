"use client";

import { useState } from "react";
import { exportCsv } from "@/lib/export/actions";
import { columnsFor, type Dataset } from "@/lib/export/columns";

const DATASETS: { value: Dataset; label: string }[] = [
  { value: "sets", label: "Sets" },
  { value: "sessions", label: "Sessions" },
];

const tile = {
  background: "var(--surface)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-tile)",
} as const;

// A download does not work from a standalone iOS PWA, which is how this app is
// used, so the share sheet is the primary path and the download is the
// fallback for Safari tabs and desktop. canShare is checked at runtime because
// the specification does not say whether text/csv is accepted.
async function deliver(filename: string, csv: string): Promise<void> {
  const file = new File([csv], filename, { type: "text/csv" });
  if (typeof navigator !== "undefined" && navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file] });
    return;
  }
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function ExportPanel() {
  const [dataset, setDataset] = useState<Dataset>("sets");
  const [keys, setKeys] = useState<string[]>(() => columnsFor("sets").map((c) => c.key));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const columns = columnsFor(dataset);
  // Declared before run() uses it. It reads the same on every render and needs
  // no state: the device's zone does not change mid session.
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  function changeDataset(next: Dataset) {
    setDataset(next);
    // Every column of the new dataset, since a carried-over selection would
    // silently drop keys that do not exist there.
    setKeys(columnsFor(next).map((c) => c.key));
    setError(null);
  }

  function toggle(key: string) {
    setKeys((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  }

  async function run() {
    setBusy(true);
    setError(null);
    const result = await exportCsv({ dataset, columns: keys, startDate, endDate, timeZone });
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    try {
      await deliver(result.filename, result.csv);
    } catch {
      // A cancelled share sheet rejects, and that is not an error worth
      // showing: the user chose to back out.
    }
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-3" style={tile}>
      <fieldset className="flex gap-4">
        <legend className="sr-only">What to export</legend>
        {DATASETS.map((d) => (
          <label key={d.value} className="flex items-center gap-2">
            <input
              type="radio"
              name="export-dataset"
              checked={dataset === d.value}
              onChange={() => changeDataset(d.value)}
              style={{ accentColor: "var(--accent)" }}
            />
            <span style={{ color: "var(--text)" }}>{d.label}</span>
          </label>
        ))}
      </fieldset>

      <fieldset className="flex flex-wrap gap-x-4 gap-y-2">
        <legend className="sr-only">Columns</legend>
        {columns.map((c) => (
          <label key={c.key} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={keys.includes(c.key)}
              onChange={() => toggle(c.key)}
              aria-label={c.header}
              style={{ accentColor: "var(--accent)" }}
            />
            <span style={{ color: "var(--text-dim)" }}>{c.header}</span>
          </label>
        ))}
      </fieldset>

      <div className="flex flex-wrap gap-3">
        <label className="text-sm" style={{ color: "var(--text-dim)" }}>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start date"
            className="block mt-1 px-3 py-2"
            style={{ ...tile, color: "var(--text)", minHeight: 44 }}
          />
        </label>
        <label className="text-sm" style={{ color: "var(--text-dim)" }}>
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="End date"
            className="block mt-1 px-3 py-2"
            style={{ ...tile, color: "var(--text)", minHeight: 44 }}
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || keys.length === 0 || !startDate || !endDate}
        className="disabled:opacity-60"
        style={{ ...tile, color: "var(--text)", minHeight: 44 }}
      >
        Export
      </button>

      {error ? (
        <p role="alert" className="text-sm" style={{ color: "var(--text-dim)" }}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
