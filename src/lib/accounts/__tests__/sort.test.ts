import { describe, it, expect } from "vitest";
import { sortAccounts } from "@/lib/accounts/sort";

// Held in one place because it was written twice, byte identical, in
// listAccounts and in AccountList, with nothing keeping the two in sync. The
// server sorts so the first paint is right and the client sorts so a row moves
// on a tap without waiting for a round trip, so both callers are needed; the
// comparator behind them is not.
const account = (approved: boolean, createdAt: string) => ({
  id: createdAt,
  approved,
  createdAt,
});

describe("sortAccounts", () => {
  it("puts the accounts that need an action first", () => {
    const sorted = sortAccounts([
      account(true, "2026-08-01T00:00:00.000Z"),
      account(false, "2026-08-02T00:00:00.000Z"),
    ]);
    expect(sorted.map((a) => a.approved)).toEqual([false, true]);
  });

  it("orders newest first within each group", () => {
    const sorted = sortAccounts([
      account(false, "2026-08-01T00:00:00.000Z"),
      account(false, "2026-08-03T00:00:00.000Z"),
      account(true, "2026-08-02T00:00:00.000Z"),
      account(true, "2026-08-04T00:00:00.000Z"),
    ]);
    expect(sorted.map((a) => a.createdAt)).toEqual([
      "2026-08-03T00:00:00.000Z",
      "2026-08-01T00:00:00.000Z",
      "2026-08-04T00:00:00.000Z",
      "2026-08-02T00:00:00.000Z",
    ]);
  });

  // The client holds the server's array in state and re-sorts it on every
  // change, so a comparator that sorted in place would reorder the caller's
  // data underneath React.
  it("does not reorder the array it was given", () => {
    const input = [
      account(true, "2026-08-01T00:00:00.000Z"),
      account(false, "2026-08-02T00:00:00.000Z"),
    ];
    sortAccounts(input);
    expect(input.map((a) => a.approved)).toEqual([true, false]);
  });
});
