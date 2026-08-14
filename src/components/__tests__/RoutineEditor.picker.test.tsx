import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoutineEditor } from "@/components/RoutineEditor";
import type { Exercise, RoutineDetail } from "@/lib/data/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
// Both live in this module: the editor imports saveRoutine and the picker it
// renders imports createExercise, so mocking only one breaks the other's import.
vi.mock("@/lib/data/actions", () => ({
  saveRoutine: vi.fn(),
  createExercise: vi.fn(),
  updateExercise: vi.fn(),
}));

const bench: Exercise = {
  id: "bench",
  name: "Bench Press",
  muscle_group: "chest",
  equipment: null,
  is_default: true,
};

const library: Exercise[] = [
  bench,
  { id: "fly", name: "Cable Fly", muscle_group: "chest", equipment: null, is_default: true },
];

// The editor reads only exercise and default_sets off each item, so the other
// three fields are here to satisfy RoutineItem rather than to be asserted on.
function routine(
  items: { exercise: Exercise; default_sets: number }[],
): RoutineDetail {
  return {
    id: "r1",
    name: "Push Day",
    items: items.map((it, i) => ({
      id: `ri${i + 1}`,
      exercise_id: it.exercise.id,
      order_index: i,
      default_sets: it.default_sets,
      exercise: it.exercise,
    })),
  };
}

describe("RoutineEditor picker toggle", () => {
  it("starts closed on a routine that already has exercises", () => {
    render(
      <RoutineEditor
        routine={routine([{ exercise: bench, default_sets: 3 }])}
        library={library}
      />,
    );
    expect(screen.getByRole("button", { name: "Add exercise" })).toBeInTheDocument();
    expect(
      screen.queryByPlaceholderText("Search or add an exercise"),
    ).not.toBeInTheDocument();
  });

  it("starts open on a routine with no exercises yet", () => {
    render(<RoutineEditor routine={routine([])} library={library} />);
    expect(
      screen.getByPlaceholderText("Search or add an exercise"),
    ).toBeInTheDocument();
  });

  it("opens and closes on the toggle", async () => {
    render(
      <RoutineEditor
        routine={routine([{ exercise: bench, default_sets: 3 }])}
        library={library}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: "Add exercise" }));
    expect(
      screen.getByPlaceholderText("Search or add an exercise"),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(
      screen.queryByPlaceholderText("Search or add an exercise"),
    ).not.toBeInTheDocument();
  });

  it("stays open after adding an exercise", async () => {
    render(<RoutineEditor routine={routine([])} library={library} />);
    await userEvent.click(screen.getByRole("button", { name: /Cable Fly/ }));
    expect(
      screen.getByPlaceholderText("Search or add an exercise"),
    ).toBeInTheDocument();
  });
});
