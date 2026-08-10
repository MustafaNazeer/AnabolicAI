import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import { logSetLocal } from "@/lib/offline/mutations";

const { parseQuickEntryMock, setAiQuickEntryMock, useOnlineMock } = vi.hoisted(
  () => ({
    parseQuickEntryMock: vi.fn(),
    setAiQuickEntryMock: vi.fn(),
    useOnlineMock: vi.fn(),
  }),
);
vi.mock("@/lib/ai/actions", () => ({
  parseQuickEntry: parseQuickEntryMock,
  setAiQuickEntry: setAiQuickEntryMock,
}));
vi.mock("@/lib/offline/useOnline", () => ({ useOnline: useOnlineMock }));

import { QuickEntry } from "@/components/QuickEntry";

const THREE_SETS = [
  { reps: 5, weight: 185, rirLow: 2, rirHigh: 2 },
  { reps: 5, weight: 185, rirLow: 2, rirHigh: 2 },
  { reps: 4, weight: 185, rirLow: 2, rirHigh: 2 },
];

beforeEach(() => {
  vi.clearAllMocks();
  useOnlineMock.mockReturnValue(true);
  parseQuickEntryMock.mockResolvedValue({ ok: true, sets: THREE_SETS });
});

// The mocked onLog in QuickEntry.test.tsx can only prove which inputs were
// passed. It cannot see set numbers, because numbering happens inside
// logSetLocal. This test wires onLog to the REAL mutation against a real
// store, which is the only way the confirm path's numbering is observable.
describe("QuickEntry set numbering, against the real logging path", () => {
  it("numbers a confirmed batch 1, 2, 3 rather than all 1", async () => {
    const store = createMemoryStore();
    let n = 0;
    const onLog = async (input: {
      reps: number;
      weight: number;
      rirLow: number | null;
      rirHigh: number | null;
    }) => {
      await logSetLocal(store, "session-1", "ex-1", input, () => `set-${++n}`);
    };

    render(
      <QuickEntry aiEnabled={true} onAiEnabled={() => {}} onLog={onLog} />,
    );

    fireEvent.change(screen.getByPlaceholderText(/185 for 5/i), {
      target: { value: "185 for 5, then 5, then 4 at 2 RIR" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add sets/i }));
    await waitFor(() => screen.getByRole("button", { name: /log 3 sets/i }));
    fireEvent.click(screen.getByRole("button", { name: /log 3 sets/i }));

    await waitFor(async () => {
      expect(await store.listSets("session-1")).toHaveLength(3);
    });

    const sets = await store.listSets("session-1");
    expect(sets.map((s) => s.setNumber).sort()).toEqual([1, 2, 3]);
    // Order matters too: the reps must follow the parsed order, not race.
    expect(
      sets.sort((a, b) => a.setNumber - b.setNumber).map((s) => s.reps),
    ).toEqual([5, 5, 4]);
  });
});
