import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import type { LastSet, SessionExercise } from "@/lib/workout/types";

vi.mock("@/lib/workout/actions", () => ({
  logSet: vi.fn(),
  deleteSet: vi.fn(),
}));

function makeItem(loggedCount: number): SessionExercise {
  return {
    exercise: { id: "ex1", name: "Bench Press", muscle_group: null, is_default: true },
    defaultSets: 3,
    loggedSets: Array.from({ length: loggedCount }, (_, i) => ({
      id: `s${i + 1}`,
      set_number: i + 1,
      reps: 8,
      weight: 135,
      rir: 2,
    })),
  };
}

const lastSets: LastSet[] = [
  { set_number: 1, reps: 8, weight: 135, rir: 2 },
  { set_number: 2, reps: 6, weight: 145, rir: 1 },
];

function renderCard(loggedCount: number, last: LastSet[] = lastSets) {
  return render(
    <ExerciseLogCard
      sessionId="sess1"
      item={makeItem(loggedCount)}
      lastSets={last}
      onLogged={() => {}}
    />,
  );
}

describe("ExerciseLogCard quick fill", () => {
  it("fills both empty fields with the matched set on tap", async () => {
    // No sets logged yet, so the user is entering set 1: matches last set 1 (135 x 8).
    renderCard(0);
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    const weightInput = screen.getAllByRole("textbox").find((el) => el.getAttribute("inputmode") === "decimal");
    const repsInput = screen.getAllByRole("textbox").find((el) => el.getAttribute("inputmode") === "numeric");
    expect(weightInput).toHaveValue("135");
    expect(repsInput).toHaveValue("8");
  });

  it("matches by set number for later sets", async () => {
    // One set already logged, so the user is entering set 2: matches last set 2 (145 x 6).
    renderCard(1);
    await userEvent.click(screen.getByRole("button", { name: /fill set 2/i }));
    const weightInput = screen.getAllByRole("textbox").find((el) => el.getAttribute("inputmode") === "decimal");
    const repsInput = screen.getAllByRole("textbox").find((el) => el.getAttribute("inputmode") === "numeric");
    expect(weightInput).toHaveValue("145");
    expect(repsInput).toHaveValue("6");
  });

  it("does not clobber a value the user already typed", async () => {
    renderCard(0);
    const weightInput = screen.getAllByRole("textbox").find((el) => el.getAttribute("inputmode") === "decimal") as HTMLInputElement;
    const repsInput = screen.getAllByRole("textbox").find((el) => el.getAttribute("inputmode") === "numeric") as HTMLInputElement;
    await userEvent.type(weightInput, "999");
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    expect(weightInput).toHaveValue("999");
    expect(repsInput).toHaveValue("8");
  });

  it("renders the reference as plain text with no button when there is no history", () => {
    renderCard(0, []);
    expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fill set/i })).toBeNull();
  });

  it("names the matched weight and reps in the aria-label", () => {
    renderCard(1);
    expect(
      screen.getByRole("button", {
        name: /fill set 2 with last time, 145 pounds for 6 reps/i,
      }),
    ).toBeInTheDocument();
  });
});
