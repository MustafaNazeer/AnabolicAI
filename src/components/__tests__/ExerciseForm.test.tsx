import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseForm } from "@/components/ExerciseForm";

function setup(overrides: Partial<Parameters<typeof ExerciseForm>[0]> = {}) {
  const onSubmit = vi.fn();
  const onCancel = vi.fn();
  render(
    <ExerciseForm
      initialName=""
      initialGroup={null}
      initialEquipment={null}
      submitLabel="Create"
      pending={false}
      error={null}
      onSubmit={onSubmit}
      onCancel={onCancel}
      {...overrides}
    />,
  );
  return { onSubmit, onCancel };
}

describe("ExerciseForm", () => {
  it("disables submit until a name, a group and an equipment are all set", async () => {
    setup({ initialName: "Pec Deck" });
    const submit = screen.getByRole("button", { name: "Create" });
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    expect(submit).toBeDisabled();

    await userEvent.click(screen.getByRole("radio", { name: "Machine" }));
    expect(submit).toBeEnabled();
  });

  it("submits the trimmed name with both chosen values", async () => {
    const { onSubmit } = setup({
      initialName: "  Pec Deck  ",
      initialGroup: "Chest",
      initialEquipment: "Machine",
    });
    await userEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledWith("Pec Deck", "Chest", "Machine");
  });

  // The picker pre-fills these from whatever filter is active, which is the
  // whole reason tagging costs zero taps in the common case.
  it("starts with the passed in values already selected", () => {
    setup({
      initialName: "Pec Deck",
      initialGroup: "Chest",
      initialEquipment: "Machine",
    });
    expect(screen.getByRole("radio", { name: "Chest" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Machine" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  // Single choice per row: picking a second value in the same row replaces
  // the first rather than adding to it.
  it("replaces the selection when another chip in the same row is picked", async () => {
    setup({ initialName: "Pec Deck", initialGroup: "Chest" });
    await userEvent.click(screen.getByRole("radio", { name: "Back" }));
    expect(screen.getByRole("radio", { name: "Back" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Chest" })).not.toBeChecked();
  });

  // Diverges from the filter chips on purpose. There, tapping the active chip
  // clears the dimension. Here the field is required, so clearing would only
  // disable submit with nothing on screen explaining why.
  it("keeps the value when the selected chip is tapped again", async () => {
    setup({
      initialName: "Pec Deck",
      initialGroup: "Chest",
      initialEquipment: "Machine",
    });
    await userEvent.click(screen.getByRole("radio", { name: "Chest" }));
    expect(screen.getByRole("radio", { name: "Chest" })).toBeChecked();
    expect(screen.getByRole("button", { name: "Create" })).toBeEnabled();
  });

  it("groups the chips so a screen reader can tell the two rows apart", () => {
    setup();
    expect(
      screen.getByRole("radiogroup", { name: "Muscle group for this exercise" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("radiogroup", { name: "Equipment for this exercise" }),
    ).toBeInTheDocument();
  });

  it("renders a server error where a screen reader will announce it", () => {
    setup({ error: "Pick a muscle group." });
    expect(screen.getByRole("alert")).toHaveTextContent("Pick a muscle group.");
  });

  it("disables submit while a save is in flight", () => {
    setup({
      initialName: "Pec Deck",
      initialGroup: "Chest",
      initialEquipment: "Machine",
      pending: true,
    });
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
  });

  it("cancels without submitting", async () => {
    const { onSubmit, onCancel } = setup({ initialName: "Pec Deck" });
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("gives every control a 44 point target", () => {
    setup({ initialName: "Pec Deck" });
    const controls = [
      ...screen.getAllByRole("radio"),
      screen.getByRole("button", { name: "Create" }),
      screen.getByRole("button", { name: "Cancel" }),
      screen.getByRole("textbox", { name: "Exercise name" }),
    ];
    for (const el of controls) {
      expect(Number.parseInt(el.style.minHeight, 10)).toBeGreaterThanOrEqual(44);
    }
  });
});
