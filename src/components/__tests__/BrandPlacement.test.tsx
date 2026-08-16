import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { DashboardHeader } from "@/components/DashboardHeader";

describe("dashboard brand mark", () => {
  it("renders a small AnabolicAI mark in the header", () => {
    const { container } = render(<DashboardHeader name="there" />);
    // The mark is inside aria-hidden="true" so getByRole won't find it —
    // query the DOM directly. The SVG must be present in the tree.
    const mark = container.querySelector("svg");
    expect(mark).toBeInTheDocument();
  });

  it("renders the greeting text", () => {
    const { getByText } = render(<DashboardHeader name="mustafa" />);
    expect(getByText(/Welcome back, mustafa/i)).toBeInTheDocument();
    expect(getByText(/Your week so far/i)).toBeInTheDocument();
  });

  it("mark wrapper is aria-hidden so it does not announce over the greeting", () => {
    const { container } = render(<DashboardHeader name="there" />);
    const wrapper = container.querySelector('[aria-hidden="true"]');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper?.querySelector("svg")).toBeInTheDocument();
  });
});
