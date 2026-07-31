// Reps in reserve, recorded as an optional range. A single value is stored
// with the same number in both fields, so consumers never branch on shape.
export type RirRange = { rirLow: number | null; rirHigh: number | null };

function parseOne(raw: string): number | null | { error: string } {
  const t = raw.trim();
  if (t === "") return null;
  if (!/^-?\d+$/.test(t)) return { error: "RIR must be a whole number." };
  const n = Number(t);
  if (n < 0 || n > 5) return { error: "RIR must be 0 to 5." };
  return n;
}

export function parseRir(
  low: string,
  high: string,
): RirRange | { error: string } {
  const lo = parseOne(low);
  if (lo !== null && typeof lo === "object") return lo;
  const hi = parseOne(high);
  if (hi !== null && typeof hi === "object") return hi;

  if (lo === null && hi === null) return { rirLow: null, rirHigh: null };
  if (lo === null) return { error: "Enter the lower RIR first." };
  if (hi === null) return { rirLow: lo, rirHigh: lo };
  if (hi < lo) return { error: "RIR range must go from low to high." };
  return { rirLow: lo, rirHigh: hi };
}

export function formatRir(low: number | null, high: number | null): string {
  // Loose null check on purpose: a set queued offline by a build predating the
  // range fields has neither of them, so they arrive undefined rather than null
  // and a strict check would let them through and print "undefined".
  if (low == null || high == null) return "";
  return low === high ? String(low) : `${low}-${high}`;
}

// The ", 0-1 RIR" clause, read by the logged set rows, the quick fill reference
// line and that button's accessible name, so all three phrase it the same way.
export function rirSuffix(low: number | null, high: number | null): string {
  const text = formatRir(low, high);
  return text ? `, ${text} RIR` : "";
}
