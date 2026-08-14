import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { updateExerciseMock } = vi.hoisted(() => ({
  updateExerciseMock: vi.fn(),
}));

vi.mock("@/lib/data/actions", () => ({
  createExercise: vi.fn(),
  updateExercise: updateExerciseMock,
}));

import { ExercisePicker } from "@/components/ExercisePicker";
import type { Exercise } from "@/lib/data/types";

const DEFAULT_LIFT: Exercise = {
  id: "d1",
  name: "Bench Press",
  muscle_group: "Chest",
  equipment: "Barbell",
  is_default: true,
};

const CUSTOM_LIFT: Exercise = {
  id: "c1",
  name: "Pec Deck",
  muscle_group: null,
  equipment: null,
  is_default: false,
};

function setup() {
  const onUpdated = vi.fn();
  render(
    <ExercisePicker
      library={[DEFAULT_LIFT, CUSTOM_LIFT]}
      onAdd={vi.fn()}
      onCreated={vi.fn()}
      onUpdated={onUpdated}
      takenIds={new Set<string>()}
    />,
  );
  return { onUpdated };
}

beforeEach(() => {
  vi.clearAllMocks();
  updateExerciseMock.mockResolvedValue({
    exercise: {
      id: "c1",
      name: "Pec Deck Machine",
      muscle_group: "Chest",
      equipment: "Machine",
      is_default: false,
    },
  });
});

describe("ExercisePicker editing", () => {
  it("offers edit on a custom and not on a default", () => {
    setup();
    expect(
      screen.getByRole("button", { name: "Edit Pec Deck" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Edit Bench Press" }),
    ).not.toBeInTheDocument();
  });

  it("opens the form with the current values", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Edit Pec Deck" }));
    expect(screen.getByRole("textbox", { name: "Exercise name" })).toHaveValue(
      "Pec Deck",
    );
    // Untagged, so nothing is preselected and Save stays disabled until the
    // user answers both, which is exactly what the sweep is for.
    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("saves the tags and hands the updated exercise back", async () => {
    const { onUpdated } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Edit Pec Deck" }));
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateExerciseMock).toHaveBeenCalledWith(
      "c1",
      "Pec Deck",
      "Chest",
      "Machine",
    );
    expect(onUpdated).toHaveBeenCalledWith(
      expect.objectContaining({ id: "c1", muscle_group: "Chest" }),
    );
  });

  // The case that cost 8 logged sets on 2026-08-13, when the only way to
  // resolve a name collision with a new default was a SQL script.
  it("renames to a name a default already uses", async () => {
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Edit Pec Deck" }));
    const nameBox = screen.getByRole("textbox", { name: "Exercise name" });
    await userEvent.clear(nameBox);
    await userEvent.type(nameBox, "Bench Press");
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(updateExerciseMock).toHaveBeenCalledWith(
      "c1",
      "Bench Press",
      "Chest",
      "Machine",
    );
  });

  it("shows the action's error and keeps the form open", async () => {
    updateExerciseMock.mockResolvedValue({ error: "Could not save." });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Edit Pec Deck" }));
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save.",
    );
    expect(
      screen.getByRole("textbox", { name: "Exercise name" }),
    ).toBeInTheDocument();
  });
});
