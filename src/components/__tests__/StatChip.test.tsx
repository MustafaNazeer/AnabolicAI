// src/components/__tests__/StatChip.test.tsx
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatChip } from "@/components/dashboard/StatChip";

describe("StatChip", () => {
  it("renders value and label", () => {
    render(<StatChip value="4" label="Workouts" />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("Workouts")).toBeInTheDocument();
  });
});
