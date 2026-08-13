import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

vi.mock("@/lib/data/actions", () => ({
  createExercise: vi.fn(async () => ({ exercise: undefined })),
}));

import { ExercisePicker } from "@/components/ExercisePicker";
import type { Exercise } from "@/lib/data/types";

const ex = (
  name: string,
  muscle_group: string | null,
  equipment: string | null,
): Exercise => ({ id: name, name, muscle_group, equipment, is_default: true });

const LIBRARY = [
  ex("Bench Press", "Chest", "Barbell"),
  ex("Dumbbell Fly", "Chest", "Dumbbell"),
  ex("Squat", "Legs", "Barbell"),
  ex("Leg Curl", "Legs", "Machine"),
  ex("My Home Move", null, null),
];

function setup() {
  return render(
    <ExercisePicker
      library={LIBRARY}
      onAdd={vi.fn()}
      onCreated={vi.fn()}
      takenIds={new Set<string>()}
    />,
  );
}

// The add buttons are the list; the chips are named by their own labels, so
// query the list by the exercise names rather than by every button on screen.
function listedNames() {
  return LIBRARY.map((e) => e.name).filter((n) =>
    screen.queryByRole("button", { name: n }),
  );
}

beforeEach(() => vi.clearAllMocks());

describe("ExercisePicker filters", () => {
  it("renders a chip for every muscle group and every equipment value", () => {
    setup();
    for (const label of ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core"]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
    for (const label of [
      "Barbell",
      "Dumbbell",
      "Machine",
      "Cable",
      "Bodyweight",
      "Other",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("narrows the list to one muscle group", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Legs" }));
    expect(listedNames()).toEqual(["Squat", "Leg Curl"]);
  });

  it("composes a group chip with an equipment chip", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Legs" }));
    await userEvent.click(screen.getByRole("button", { name: "Machine" }));
    expect(listedNames()).toEqual(["Leg Curl"]);
  });

  it("clears a dimension when its active chip is tapped again", async () => {
    setup();
    const legs = screen.getByRole("button", { name: "Legs" });
    await userEvent.click(legs);
    expect(listedNames()).toEqual(["Squat", "Leg Curl"]);
    await userEvent.click(legs);
    expect(listedNames()).toHaveLength(LIBRARY.length);
  });

  it("selects only one chip per row", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Legs" }));
    await userEvent.click(screen.getByRole("button", { name: "Chest" }));
    expect(listedNames()).toEqual(["Bench Press", "Dumbbell Fly"]);
  });

  it("marks the active chip as pressed for assistive technology", async () => {
    setup();
    const legs = screen.getByRole("button", { name: "Legs" });
    expect(legs).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(legs);
    expect(legs).toHaveAttribute("aria-pressed", "true");
  });

  it("composes a chip with the search box", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Chest" }));
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "dumb",
    );
    expect(listedNames()).toEqual(["Dumbbell Fly"]);
  });

  it("still offers to create an unmatched name while a filter is active", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Legs" }));
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "Sled Push",
    );
    expect(
      screen.getByRole("button", { name: /Create "Sled Push"/ }),
    ).toBeInTheDocument();
  });

  it("says so when the filters exclude everything", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Core" }));
    expect(screen.getByText("No exercises match those filters.")).toBeInTheDocument();
  });
});
