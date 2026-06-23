import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/Card";

describe("Card", () => {
  it("renders children and merges className", () => {
    render(<Card className="mt-4">hello</Card>);
    const el = screen.getByText("hello");
    expect(el).toBeInTheDocument();
    expect(el.className).toContain("mt-4");
  });
});
