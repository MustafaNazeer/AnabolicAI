// src/components/__tests__/MatrixCard.test.tsx
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MatrixCard } from "@/components/dashboard/MatrixCard";
import type { MatrixDay } from "@/lib/progress/matrix";

function days(): MatrixDay[] {
  return Array.from({ length: 35 }, (_, i) => ({
    dateKey: `2026-05-${String(i + 1).padStart(2, "0")}`,
    trained: i >= 28,
    volume: i >= 28 ? 4000 : 0,
    prCount: 0,
  }));
}

describe("MatrixCard", () => {
  beforeEach(() => localStorage.clear());

  it("defaults to the Gym days metric and switches on click", async () => {
    render(<MatrixCard days={days()} />);
    expect(screen.getByText("Gym days this week")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("tab", { name: "Volume" }));
    expect(screen.getByText("Volume this week")).toBeInTheDocument();
  });
});
