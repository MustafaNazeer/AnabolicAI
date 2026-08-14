import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoutineEditor } from "@/components/RoutineEditor";
import { updateExercise } from "@/lib/data/actions";
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

const customLift: Exercise = {
  id: "custom1",
  name: "Old Custom",
  muscle_group: "chest",
  equipment: null,
  is_default: false,
};

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

  // The 2026-08-12 failure mode: appending the edited exercise to `extra`
  // without also dropping its stale copy from `library` renders two rows
  // sharing one id, and React logs a duplicate key warning for it.
  it("keeps exactly one row for a renamed custom and logs no duplicate key warning", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(updateExercise).mockResolvedValueOnce({
      exercise: {
        id: "custom1",
        name: "New Custom",
        muscle_group: "chest",
        equipment: "Machine",
        is_default: false,
      },
    });

    render(
      <RoutineEditor routine={routine([])} library={[...library, customLift]} />,
    );

    await userEvent.click(screen.getByRole("button", { name: "Edit Old Custom" }));
    const nameBox = screen.getByRole("textbox", { name: "Exercise name" });
    await userEvent.clear(nameBox);
    await userEvent.type(nameBox, "New Custom");
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    // Two buttons are named "Save": the edit form's and the routine's own,
    // further down the page. The form's renders first.
    await userEvent.click(screen.getAllByRole("button", { name: "Save" })[0]);

    expect(
      await screen.findByRole("button", { name: "New Custom" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Old Custom" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "New Custom" }),
    ).toHaveLength(1);

    const duplicateKeyWarning = errorSpy.mock.calls.some((args) =>
      args.some(
        (arg) =>
          typeof arg === "string" &&
          arg.includes("two children with the same key"),
      ),
    );
    expect(duplicateKeyWarning).toBe(false);

    errorSpy.mockRestore();
  });
});
