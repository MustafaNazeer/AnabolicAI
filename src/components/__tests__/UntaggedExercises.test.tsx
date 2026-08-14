import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { updateExerciseMock } = vi.hoisted(() => ({
  updateExerciseMock: vi.fn(),
}));

vi.mock("@/lib/data/actions", () => ({
  updateExercise: updateExerciseMock,
}));

import { UntaggedExercises } from "@/components/UntaggedExercises";
import type { Exercise } from "@/lib/data/types";

const UNTAGGED: Exercise[] = [
  {
    id: "c1",
    name: "Pec Deck",
    muscle_group: null,
    equipment: null,
    is_default: false,
  },
  {
    id: "c2",
    name: "SLDL",
    muscle_group: "Legs",
    equipment: null,
    is_default: false,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  updateExerciseMock.mockResolvedValue({
    exercise: {
      id: "c1",
      name: "Pec Deck",
      muscle_group: "Chest",
      equipment: "Machine",
      is_default: false,
    },
  });
});

describe("UntaggedExercises", () => {
  it("lists every exercise still missing a value", () => {
    render(<UntaggedExercises initial={UNTAGGED} />);
    expect(screen.getByRole("button", { name: "Tag Pec Deck" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tag SLDL" })).toBeInTheDocument();
  });

  it("says so plainly when nothing is left rather than rendering an empty box", () => {
    render(<UntaggedExercises initial={[]} />);
    expect(
      screen.getByText("Every exercise you have added is tagged."),
    ).toBeInTheDocument();
  });

  // The half tagged case: SLDL already knows it is Legs, so that chip starts
  // selected and only equipment is left to answer.
  it("pre-fills whichever value the exercise already has", async () => {
    render(<UntaggedExercises initial={UNTAGGED} />);
    await userEvent.click(screen.getByRole("button", { name: "Tag SLDL" }));
    expect(screen.getByRole("radio", { name: "Legs" })).toBeChecked();
  });

  it("removes an exercise from the list once it is fully tagged", async () => {
    render(<UntaggedExercises initial={UNTAGGED} />);
    await userEvent.click(screen.getByRole("button", { name: "Tag Pec Deck" }));
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateExerciseMock).toHaveBeenCalledWith(
      "c1",
      "Pec Deck",
      "Chest",
      "Machine",
    );
    expect(
      screen.queryByRole("button", { name: "Tag Pec Deck" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tag SLDL" })).toBeInTheDocument();
  });

  // Pins the remount: without key={editing.id} on the ExerciseForm in
  // UntaggedExercises.tsx, React reuses the same form instance across the two
  // taps below, and the useState-seeded name and chips keep showing the first
  // exercise while Save would write to the second exercise's id.
  it("shows the second exercise when its row is tapped while the first form is still open", async () => {
    render(<UntaggedExercises initial={UNTAGGED} />);
    await userEvent.click(screen.getByRole("button", { name: "Tag Pec Deck" }));
    await userEvent.click(screen.getByRole("button", { name: "Tag SLDL" }));

    expect(screen.getByRole("textbox", { name: "Exercise name" })).toHaveValue(
      "SLDL",
    );

    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateExerciseMock).toHaveBeenCalledWith("c2", "SLDL", "Legs", "Machine");
  });

  it("keeps the exercise listed when the save fails", async () => {
    updateExerciseMock.mockResolvedValue({ error: "Could not save." });
    render(<UntaggedExercises initial={UNTAGGED} />);
    await userEvent.click(screen.getByRole("button", { name: "Tag Pec Deck" }));
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not save.");
    expect(
      screen.getByRole("button", { name: "Tag Pec Deck" }),
    ).toBeInTheDocument();
  });
});
