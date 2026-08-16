import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { addMock } = vi.hoisted(() => ({
  addMock: vi.fn(async () => ({ ok: true as const })),
}));
vi.mock("@/lib/planner/categoryActions", () => ({ addPlannerCategory: addMock }));

import { PlannerCategoryAdd } from "@/components/PlannerCategoryAdd";

beforeEach(() => vi.clearAllMocks());

describe("PlannerCategoryAdd", () => {
  it("sends the typed name", async () => {
    render(<PlannerCategoryAdd />);
    await userEvent.type(screen.getByLabelText(/new category/i), "Yoga");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(addMock).toHaveBeenCalledWith("Yoga");
  });

  it("shows the error rather than swallowing it", async () => {
    addMock.mockResolvedValueOnce({ error: "Give the category a name." } as never);
    render(<PlannerCategoryAdd />);
    await userEvent.type(screen.getByLabelText(/new category/i), "x");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(await screen.findByText("Give the category a name.")).toBeInTheDocument();
  });

  // Clearing on success is what makes a second add possible without deleting
  // the first name by hand, and leaving the text there reads as a failed save.
  it("clears the field once the category is added", async () => {
    render(<PlannerCategoryAdd />);
    const field = screen.getByLabelText(/new category/i);
    await userEvent.type(field, "Yoga");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(field).toHaveValue("");
  });

  // The counterpart. A failed add must keep what was typed, or she loses the
  // name to a network blip and has to type it again.
  it("keeps what was typed when the add fails", async () => {
    addMock.mockResolvedValueOnce({ error: "Network is down." } as never);
    render(<PlannerCategoryAdd />);
    const field = screen.getByLabelText(/new category/i);
    await userEvent.type(field, "Yoga");
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(await screen.findByText("Network is down.")).toBeInTheDocument();
    expect(field).toHaveValue("Yoga");
  });
});
