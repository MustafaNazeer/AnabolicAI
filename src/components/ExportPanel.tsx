"use client";

import { useState } from "react";
import { exportCsv } from "@/lib/export/actions";
import { columnsFor, type Dataset } from "@/lib/export/columns";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

const DATASETS: { value: Dataset; label: string }[] = [
  { value: "sets", label: "Sets" },
  { value: "sessions", label: "Sessions" },
];

// The tile convention every other surface in the app uses, blur included.
// AiQuickEntryToggle, the notification rows and the finish button all carry
// it, and its absence is what made this panel read as foreign.
const tile = {
  background: "var(--surface)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-tile)",
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
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
  // Read on every render rather than held in state: the device's zone does not
  // change mid session.
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
    <div className="flex flex-col gap-4">
      {/* The same component the Appearance section renders, so the two cannot
          drift apart. */}
      <SegmentedControl<Dataset>
        label="What to export"
        value={dataset}
        onChange={changeDataset}
        options={DATASETS}
      />

      {/* Selection as pressed buttons rather than checkboxes, following
          ThemePicker one section above: this is how the app already lets you
          pick from a set, and a grid stays compact where nine rows would not. */}
      <div className="grid grid-cols-3 gap-2">
        {columns.map((c) => {
          const on = keys.includes(c.key);
          return (
            <button
              key={c.key}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c.key)}
              className="text-[11px] font-medium px-2 py-2"
              style={{
                ...tile,
                minHeight: 44,
                border: `2px solid ${on ? "var(--accent)" : "transparent"}`,
                color: on ? "var(--text)" : "var(--text-dim)",
              }}
            >
              {c.header}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs" style={{ color: "var(--text-dim)" }}>
          Start date
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            aria-label="Start date"
            className="block w-full mt-1 px-3"
            style={{ ...tile, color: "var(--text)", minHeight: 44 }}
          />
        </label>
        <label className="text-xs" style={{ color: "var(--text-dim)" }}>
          End date
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            aria-label="End date"
            className="block w-full mt-1 px-3"
            style={{ ...tile, color: "var(--text)", minHeight: 44 }}
          />
        </label>
      </div>

      {/* The app's primary action button, copied from the finish button in
          ActiveWorkout rather than invented here. */}
      <button
        type="button"
        onClick={() => void run()}
        disabled={busy || keys.length === 0 || !startDate || !endDate}
        className="font-semibold py-3 w-full disabled:opacity-60"
        style={{ ...tile, color: "var(--text)", minHeight: 48 }}
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
