import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ActiveWorkout } from "@/components/ActiveWorkout";
import { createMemoryStore } from "@/lib/offline/memoryStore";
import { updateExercise } from "@/lib/data/actions";
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
// The picker underneath the swap flow imports both of these from the same
// module, so the mock has to declare both regardless of which this file uses.
vi.mock("@/lib/data/actions", () => ({
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
}));

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
    { id: "bench", name: "Barbell Bench", muscle_group: "chest", equipment: null, is_default: true },
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
            rirLow: 2,
            rirHigh: 2,
            syncState: "synced",
          },
        ]}
      />,
    );
    expect(
      await screen.findByText("Also logged this session"),
    ).toBeInTheDocument();
  });

  // Slot A swapped to X, a set logged on X, then slot A swapped again to Y:
  // X has no card of its own, so it surfaces as an orphan below, still
  // editable from the picker (it is a custom with sets on it). Renaming it
  // there has to reach the orphan card too, since snapshot.library is frozen
  // at page load and the orphan card reads a name from it.
  it("shows an orphan's new name after renaming it from the picker", async () => {
    const orphanSnapshot: Snapshot = {
      sessionId: "sess1",
      routineName: "Push Day",
      restSeconds: 120,
      exercises: [
        {
          exerciseId: "slotA",
          name: "Slot A",
          muscleGroup: "chest",
          isDefault: true,
          defaultSets: 3,
        },
      ],
      lastByExercise: {},
      swaps: [{ originalExerciseId: "slotA", replacementExerciseId: "y1" }],
      library: [
        { id: "y1", name: "Y Lift", muscle_group: "chest", equipment: null, is_default: true },
        { id: "x1", name: "Old X", muscle_group: null, equipment: null, is_default: false },
      ] as Snapshot["library"],
    };

    vi.mocked(updateExercise).mockResolvedValue({
      exercise: {
        id: "x1",
        name: "New X",
        muscle_group: "Chest",
        equipment: "Machine",
        is_default: false,
      },
    });

    render(
      <ActiveWorkout
        snapshot={orphanSnapshot}
        serverSets={[
          {
            id: "s1",
            sessionId: "sess1",
            exerciseId: "x1",
            setNumber: 1,
            reps: 10,
            weight: 100,
            rirLow: 2,
            rirHigh: 2,
            syncState: "synced",
          },
        ]}
      />,
    );

    expect(
      await screen.findByText("Also logged this session"),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Old X" })).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "Swap Y Lift for another exercise" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "Edit Old X" }));

    const nameBox = screen.getByRole("textbox", { name: "Exercise name" });
    await userEvent.clear(nameBox);
    await userEvent.type(nameBox, "New X");
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(
      await screen.findByRole("heading", { name: "New X" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Old X" }),
    ).not.toBeInTheDocument();
  });
});
