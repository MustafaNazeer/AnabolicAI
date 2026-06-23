import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, it, expect } from "vitest";
import { StatChip } from "@/components/dashboard/StatChip";

describe("a11y tooling", () => {
  it("renders StatChip with no axe violations", async () => {
    const { container } = render(<StatChip value="4" label="Workouts" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
