import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlannerBalance } from "@/components/PlannerBalance";

const names = { c1: "Lower Body", c2: "Cardio" };

describe("PlannerBalance", () => {
  it("shows a count for each category that was trained", () => {
    render(
      <PlannerBalance
        categoryNames={names}
        days={[
          { day: "2026-08-10", done: true, categories: ["c1"] },
          { day: "2026-08-11", done: true, categories: ["c2"] },
          { day: "2026-08-12", done: true, categories: ["c2"] },
        ]}
      />,
    );
    expect(screen.getByText("Lower Body")).toBeInTheDocument();
    expect(screen.getByTestId("balance-c2")).toHaveTextContent("2");
  });

  // The same rule as the logic layer, asserted where she actually reads it.
  it("does not count a day that was only planned", () => {
    render(
      <PlannerBalance
        categoryNames={names}
        days={[{ day: "2026-08-20", done: false, categories: ["c2"] }]}
      />,
    );
    expect(screen.queryByTestId("balance-c2")).toBeNull();
  });

  it("says so plainly when nothing has been logged this week", () => {
    render(<PlannerBalance categoryNames={names} days={[]} />);
    expect(screen.getByText(/nothing logged/i)).toBeInTheDocument();
  });

  // A day carrying two labels adds one to each, which is the rule that falls
  // out of letting a day hold several. Read here rather than only in
  // balanceCounts because this is the surface that makes the claim.
  it("counts a doubled up day toward both of its categories", () => {
    render(
      <PlannerBalance
        categoryNames={names}
        days={[{ day: "2026-08-10", done: true, categories: ["c1", "c2"] }]}
      />,
    );
    expect(screen.getByTestId("balance-c1")).toHaveTextContent("1");
    expect(screen.getByTestId("balance-c2")).toHaveTextContent("1");
  });
});
