import { describe, it, expect, vi, beforeEach } from "vitest";

const { getSetRowsMock, getSessionRowsMock, getVerifiedUserMock } = vi.hoisted(() => ({
  getSetRowsMock: vi.fn(),
  getSessionRowsMock: vi.fn(),
  getVerifiedUserMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({})),
}));

vi.mock("@/lib/auth/user", () => ({
  getVerifiedUser: getVerifiedUserMock,
}));

vi.mock("@/lib/export/queries", () => ({
  getSetRows: getSetRowsMock,
  getSessionRows: getSessionRowsMock,
}));

import { exportCsv } from "@/lib/export/actions";

const BASE = {
  dataset: "sets" as const,
  columns: ["date", "exercise", "reps"],
  startDate: "2026-08-01",
  endDate: "2026-08-12",
  timeZone: "America/Chicago",
};

const ROW = {
  date: "2026-08-05T18:00:00.000Z",
  routineName: "Push Day",
  exerciseName: "Bench Press",
  setNumber: 1,
  reps: 5,
  weight: 185,
  rirLow: null,
  rirHigh: null,
};

beforeEach(() => {
  getVerifiedUserMock.mockReset().mockResolvedValue({ id: "u1", email: "a@b.com" });
  getSetRowsMock.mockReset().mockResolvedValue([ROW]);
  getSessionRowsMock.mockReset().mockResolvedValue([]);
});

describe("exportCsv", () => {
  it("returns a csv and a filename carrying both dates", async () => {
    const result = await exportCsv(BASE);
    if (!result.ok) throw new Error(result.error);
    expect(result.filename).toBe("onyx-sets-2026-08-01-to-2026-08-12.csv");
    expect(result.csv).toBe("Date,Exercise,Reps\r\n2026-08-05,Bench Press,5");
  });

  it("refuses when not signed in", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    expect(await exportCsv(BASE)).toEqual({ ok: false, error: "Not signed in." });
  });

  // The client sends these keys, so an arbitrary string must never reach a
  // query. This is the check that makes the catalogue load bearing.
  it("rejects a column that is not in the catalogue", async () => {
    const result = await exportCsv({ ...BASE, columns: ["date", "user_id"] });
    expect(result).toEqual({ ok: false, error: "Unknown column: user_id" });
    expect(getSetRowsMock).not.toHaveBeenCalled();
  });

  it("rejects an empty column selection", async () => {
    const result = await exportCsv({ ...BASE, columns: [] });
    expect(result).toEqual({ ok: false, error: "Choose at least one column." });
    expect(getSetRowsMock).not.toHaveBeenCalled();
  });

  it("rejects a range that ends before it starts", async () => {
    const result = await exportCsv({ ...BASE, startDate: "2026-08-12", endDate: "2026-08-01" });
    expect(result).toEqual({ ok: false, error: "The end date is before the start date." });
    expect(getSetRowsMock).not.toHaveBeenCalled();
  });

  // A headers-only file opened in Sheets reads as a broken export rather than
  // as an empty range, so this says so instead of producing one.
  it("says so when the range holds nothing rather than returning an empty file", async () => {
    getSetRowsMock.mockResolvedValue([]);
    expect(await exportCsv(BASE)).toEqual({
      ok: false,
      error: "No sets in that range.",
    });
  });

  it("reads sessions when the sessions dataset is chosen", async () => {
    getSessionRowsMock.mockResolvedValue([
      {
        date: "2026-08-05T18:00:00.000Z",
        routineName: "Push Day",
        totalSets: 12,
        totalVolume: 9000,
      },
    ]);
    const result = await exportCsv({
      ...BASE,
      dataset: "sessions",
      columns: ["date", "totalSets"],
    });
    if (!result.ok) throw new Error(result.error);
    expect(result.filename).toBe("onyx-sessions-2026-08-01-to-2026-08-12.csv");
    expect(result.csv).toBe("Date,Total sets\r\n2026-08-05,12");
    expect(getSetRowsMock).not.toHaveBeenCalled();
  });
});
