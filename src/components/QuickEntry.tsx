"use client";

import { useState } from "react";
import { parseQuickEntry, setAiQuickEntry } from "@/lib/ai/actions";
import { useOnline } from "@/lib/offline/useOnline";
import type { ParsedSet } from "@/lib/ai/schema";

const fieldStyle = {
  background: "var(--surface-sunken)",
  border: "1px solid var(--surface-border)",
  borderRadius: "var(--radius-square)",
  color: "var(--text)",
  minHeight: 44,
} as const;

type LogInput = {
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};

type DraftRow = {
  reps: string;
  weight: string;
  rirLow: string;
  rirHigh: string;
};

function toDraft(s: ParsedSet): DraftRow {
  return {
    reps: String(s.reps),
    weight: String(s.weight),
    rirLow: s.rirLow === null ? "" : String(s.rirLow),
    rirHigh: s.rirHigh === null ? "" : String(s.rirHigh),
  };
}

// Draft rows are strings so editing feels like the manual inputs; conversion
// happens once at confirm. A row that no longer parses blocks the confirm, so
// a hand edit can never reach logSet with numbers logSet would reject.
function fromDraft(d: DraftRow): LogInput | null {
  const reps = Number(d.reps);
  const weight = Number(d.weight);
  if (d.reps.trim() === "" || !Number.isFinite(reps) || reps < 1) return null;
  if (d.weight.trim() === "" || !Number.isFinite(weight) || weight < 0)
    return null;
  const low = d.rirLow.trim() === "" ? null : Number(d.rirLow);
  const high = d.rirHigh.trim() === "" ? null : Number(d.rirHigh);
  if ((low === null) !== (high === null)) return null;
  if (low !== null && high !== null) {
    if (!Number.isInteger(low) || low < 0 || low > 5) return null;
    if (!Number.isInteger(high) || high < 0 || high > 5) return null;
    if (low > high) return null;
  }
  return { reps, weight, rirLow: low, rirHigh: high };
}

export function QuickEntry({
  aiEnabled,
  onAiEnabled,
  onLog,
}: {
  aiEnabled: boolean;
  onAiEnabled: () => void;
  // Awaitable on purpose. See confirm(): the logging path derives a set number
  // from a read of the store, so these must not overlap.
  onLog: (input: LogInput) => void | Promise<void>;
}) {
  const online = useOnline();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);
  const [rows, setRows] = useState<DraftRow[] | null>(null);

  async function parse() {
    setBusy(true);
    setError(null);
    const result = await parseQuickEntry(text);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows(result.sets.map(toDraft));
  }

  async function submit() {
    // The notice always comes first while consent is off, so nothing is sent
    // before the user has seen what leaves the device.
    if (!aiEnabled) {
      setNotice(true);
      return;
    }
    await parse();
  }

  async function enable() {
    const result = await setAiQuickEntry(true);
    if ("error" in result) {
      setError(result.error);
      setNotice(false);
      return;
    }
    onAiEnabled();
    setNotice(false);
    await parse();
  }

  function updateRow(index: number, patch: Partial<DraftRow>) {
    setRows((r) =>
      r ? r.map((row, i) => (i === index ? { ...row, ...patch } : row)) : r,
    );
  }

  async function confirm() {
    if (!rows || busy) return;
    const inputs: LogInput[] = [];
    for (const row of rows) {
      const parsed = fromDraft(row);
      if (!parsed) {
        setError("Fix the highlighted numbers first.");
        return;
      }
      inputs.push(parsed);
    }
    // ONE AT A TIME, AWAITED. logSetLocal derives the set number by reading the
    // store and counting, so firing these together makes every row read the
    // same count and land as "Set 1". That shipped to a device and was caught
    // there, because a mocked onLog cannot observe set numbers at all.
    setBusy(true);
    for (const input of inputs) await onLog(input);
    setBusy(false);
    setRows(null);
    setText("");
    setError(null);
  }

  return (
    <div className="mb-3">
      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder='Quick entry: "185 for 5, then 5, then 4"'
          className="flex-1 px-3 text-sm disabled:opacity-60"
          style={fieldStyle}
          disabled={busy}
        />
        <button
          type="button"
          onClick={() => void submit()}
          disabled={!online || busy || text.trim() === ""}
          className="px-3 text-sm font-medium disabled:opacity-60"
          style={fieldStyle}
        >
          Add sets
        </button>
      </div>
      {!online ? (
        <p className="text-xs mt-1" style={{ color: "var(--text-dim)" }}>
          Quick entry needs a connection. It works again once you are back
          online.
        </p>
      ) : null}
      {error ? (
        <p
          className="text-xs mt-1"
          role="alert"
          style={{ color: "var(--danger, #b91c1c)" }}
        >
          {error}
        </p>
      ) : null}

      {notice ? (
        <div
          className="mt-2 p-3 text-sm"
          style={{
            background: "var(--surface)",
            border: "1px solid var(--surface-border)",
            borderRadius: "var(--radius-tile)",
          }}
        >
          <p style={{ color: "var(--text)" }}>
            Quick entry sends only what you type to Anthropic&apos;s API to turn
            it into sets. No exercise names, history, or account details leave
            the app. Turn it off any time in Settings.
          </p>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={() => void enable()}
              className="px-3 py-2 text-sm font-medium"
              style={fieldStyle}
            >
              Enable
            </button>
            <button
              type="button"
              onClick={() => setNotice(false)}
              className="px-3 py-2 text-sm"
              style={{ ...fieldStyle, color: "var(--text-dim)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {rows ? (
        <div className="mt-2 flex flex-col gap-2">
          {rows.map((row, i) => (
            <div key={i} className="flex gap-2 items-center">
              <input
                aria-label={`preview reps ${i + 1}`}
                inputMode="numeric"
                value={row.reps}
                onChange={(e) => updateRow(i, { reps: e.target.value })}
                className="w-16 px-2 text-sm"
                style={fieldStyle}
              />
              <input
                aria-label={`preview weight ${i + 1}`}
                inputMode="decimal"
                value={row.weight}
                onChange={(e) => updateRow(i, { weight: e.target.value })}
                className="w-20 px-2 text-sm"
                style={fieldStyle}
              />
              <input
                aria-label={`preview RIR low ${i + 1}`}
                inputMode="numeric"
                value={row.rirLow}
                onChange={(e) => updateRow(i, { rirLow: e.target.value })}
                className="w-12 px-2 text-sm"
                style={fieldStyle}
              />
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                to
              </span>
              <input
                aria-label={`preview RIR high ${i + 1}`}
                inputMode="numeric"
                value={row.rirHigh}
                onChange={(e) => updateRow(i, { rirHigh: e.target.value })}
                className="w-12 px-2 text-sm"
                style={fieldStyle}
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void confirm()}
              disabled={busy}
              className="px-3 py-2 text-sm font-medium disabled:opacity-60"
              style={fieldStyle}
            >
              Log {rows.length} {rows.length === 1 ? "set" : "sets"}
            </button>
            <button
              type="button"
              onClick={() => {
                setRows(null);
                setError(null);
              }}
              className="px-3 py-2 text-sm"
              style={{ ...fieldStyle, color: "var(--text-dim)" }}
            >
              Discard
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
