import { describe, it, expect, vi, beforeEach } from "vitest";

const { createClientMock, selectMock, maybeSingleMock } = vi.hoisted(() => {
  const maybeSingleMock = vi.fn();
  // Declared with its signature rather than an implementation, so mock.calls
  // records the column list. What this suite is really asserting is that
  // visibility rides the consent select instead of adding a second query.
  const selectMock = vi.fn<(columns: string) => { maybeSingle: typeof maybeSingleMock }>();
  return {
    maybeSingleMock,
    selectMock,
    createClientMock: vi.fn(async () => ({
      from: vi.fn(() => ({ select: selectMock })),
    })),
  };
});

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import {
  getAiQuickEntry,
  getAiPlateau,
  getAiInsights,
} from "@/lib/ai/queries";

beforeEach(() => {
  vi.clearAllMocks();
  selectMock.mockReturnValue({ maybeSingle: maybeSingleMock });
  maybeSingleMock.mockResolvedValue({ data: null });
});

// Every one of these already selected its own consent column before rendering,
// so visibility rides that same select rather than adding a query. The dashboard
// comment at src/app/page.tsx records that awaiting a consent flag on its own
// cost a round trip on every load, and the open signup design made the same
// call for `approved`. A separate getAiVisible would have undone both.
describe.each([
  ["getAiQuickEntry", getAiQuickEntry, "ai_quick_entry"],
  ["getAiPlateau", getAiPlateau, "ai_plateau"],
  ["getAiInsights", getAiInsights, "ai_insights"],
] as const)("%s", (_name, query, column) => {
  it("reads visibility in the same select as consent", async () => {
    await query();
    expect(selectMock).toHaveBeenCalledTimes(1);
    expect(selectMock.mock.calls[0][0]).toContain(column);
    expect(selectMock.mock.calls[0][0]).toContain("ai_visible");
  });

  it("returns consent and visibility together", async () => {
    maybeSingleMock.mockResolvedValue({
      data: { [column]: true, ai_visible: false },
    });
    await expect(query()).resolves.toEqual({ enabled: true, visible: false });
  });

  // Consent and visibility fail in opposite directions, and each default is a
  // deliberate choice. An unreadable consent flag must not authorise sending
  // anything, so it reads false. An unreadable visibility flag must not make
  // the app look broken by silently emptying three screens, so it reads true
  // and matches the column default.
  it("defaults to no consent and visible when there is no row", async () => {
    maybeSingleMock.mockResolvedValue({ data: null });
    await expect(query()).resolves.toEqual({ enabled: false, visible: true });
  });
});
