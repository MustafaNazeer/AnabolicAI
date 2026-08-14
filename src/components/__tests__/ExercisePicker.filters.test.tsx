import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { join } from "node:path";

vi.mock("@/lib/data/actions", () => ({
  createExercise: vi.fn(async () => ({ exercise: undefined })),
  updateExercise: vi.fn(),
}));

import { ExercisePicker } from "@/components/ExercisePicker";
import { GROUPS, EQUIPMENT } from "@/lib/data/vocabulary";
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
      onUpdated={vi.fn()}
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
    expect(screen.getByText("No exercises match.")).toBeInTheDocument();
  });

  it("points at the active filter when a full match is hidden by it and no create is offered", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Chest" }));
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "squat",
    );
    expect(listedNames()).toEqual([]);
    expect(
      screen.queryByRole("button", { name: /Create/ }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/Tap the active filter to clear it\.?$/),
    ).toBeInTheDocument();
  });

  it("points at the active filter even while create is offered for a partial match", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Chest" }));
    await userEvent.type(
      screen.getByPlaceholderText("Search or add an exercise"),
      "squa",
    );
    expect(listedNames()).toEqual([]);
    expect(
      screen.getByRole("button", { name: /Create "squa"/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Tap the active filter to clear it\.?$/),
    ).toBeInTheDocument();
  });

  it("gives every chip a 44px minimum tap target", () => {
    setup();
    expect(screen.getByRole("button", { name: "Legs" })).toHaveStyle({
      minHeight: "44px",
    });
  });

  it("groups the chip rows under their own accessible names", () => {
    setup();
    expect(
      screen.getByRole("group", { name: "Muscle group" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Equipment" })).toBeInTheDocument();
  });

  it("keeps the chip vocabularies in step with the seeded library", () => {
    const sql = readFileSync(
      join(__dirname, "../../../supabase/migrations/0012_exercise_library.sql"),
      "utf8",
    );
    const rows = [
      ...sql.matchAll(/^ {2}\('[^']+', '([A-Za-z]+)', '([A-Za-z]+)'\)/gm),
    ];
    expect(rows.length).toBeGreaterThan(100);
    expect([...new Set(rows.map((m) => m[1]))].sort()).toEqual(
      [...GROUPS].sort(),
    );
    expect([...new Set(rows.map((m) => m[2]))].sort()).toEqual(
      [...EQUIPMENT].sort(),
    );
  });

  // After 0013 the muscle group vocabulary is defined in TWO places: 0012's
  // data and 0013's CHECK. The test above reads only the first, so a value
  // added to the chips and to 0012 but not to the constraint would pass it
  // and fail at the database. This closes that seam.
  it("keeps the muscle group constraint in step with the chips", () => {
    const sql = readFileSync(
      join(
        __dirname,
        "../../../supabase/migrations/0013_muscle_group_vocabulary.sql",
      ),
      "utf8",
    );
    // Match the parenthesised IN list specifically rather than every quoted
    // word in the file, so a value named in a comment cannot satisfy this.
    const list = sql.match(/muscle_group in\s*\(([^)]*)\)/)?.[1] ?? "";
    const constrained = [...list.matchAll(/'([A-Za-z]+)'/g)].map((m) => m[1]);
    expect(constrained.length).toBeGreaterThan(0);
    expect([...new Set(constrained)].sort()).toEqual([...GROUPS].sort());
  });
});
