import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ActiveWorkout } from "@/components/ActiveWorkout";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import type { Snapshot } from "@/lib/offline/store";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/workout/actions", () => ({
  logSet: vi.fn(),
  deleteSet: vi.fn(),
  finishSession: vi.fn(),
  swapExercise: vi.fn(),
  undoSwap: vi.fn(),
}));
// jsdom has no indexedDB, so the real adapter degrades to a no-op store and the
// mount effect would wipe the seeded sets back out. The in-memory store is the
// same interface and makes the component's own logic the thing under test.
vi.mock("@/lib/offline/idb", () => ({ createIdbStore: () => createMemoryStore() }));

const snapshot: Snapshot = {
  sessionId: "sess1",
  routineName: "Push Day",
  restSeconds: 120,
  exercises: [
    {
      exerciseId: "pecdeck",
      name: "Pec Deck",
      muscleGroup: "chest",
      isDefault: true,
      defaultSets: 3,
    },
    {
      exerciseId: "fly",
      name: "Cable Fly",
      muscleGroup: "chest",
      isDefault: true,
      defaultSets: 3,
    },
  ],
  lastByExercise: {},
  swaps: [{ originalExerciseId: "pecdeck", replacementExerciseId: "bench" }],
  library: [
    { id: "bench", name: "Barbell Bench", muscle_group: "chest", is_default: true },
  ] as Snapshot["library"],
};

describe("ActiveWorkout with a swap", () => {
  it("renders the replacement in the original's position", async () => {
    render(<ActiveWorkout snapshot={snapshot} serverSets={[]} />);
    const headings = await screen.findAllByRole("heading", { level: 3 });
    expect(headings.map((h) => h.textContent)).toEqual([
      "Barbell Bench",
      "Cable Fly",
    ]);
    expect(screen.getByText("Swapped out Pec Deck")).toBeInTheDocument();
  });

  it("groups sets logged on an exercise no card shows", async () => {
    render(
      <ActiveWorkout
        snapshot={snapshot}
        serverSets={[
          {
            id: "s1",
            sessionId: "sess1",
            exerciseId: "ghost",
            setNumber: 1,
            reps: 10,
            weight: 100,
            rir: 2,
            syncState: "synced",
          },
        ]}
      />,
    );
    expect(
      await screen.findByText("Also logged this session"),
    ).toBeInTheDocument();
  });
});
