import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ProgressView } from "@/components/ProgressView";
import type { ProgressData } from "@/lib/progress/types";

const data: ProgressData = {
  exercises: [{ id: "ex1", name: "Bench Press" }],
  series: {
    ex1: [
      { sessionId: "s1", date: "2026-06-01", maxWeight: 135, e1rm: 160, volume: 3240, topSetReps: 8 },
      { sessionId: "s2", date: "2026-06-08", maxWeight: 145, e1rm: 170, volume: 3480, topSetReps: 6 },
    ],
  },
};

beforeEach(() => localStorage.clear());

describe("ProgressView metric switcher", () => {
  it("shows the weight chart title by default", () => {
    render(<ProgressView data={data} />);
    expect(screen.getByRole("heading", { name: "Weight over time" })).toBeInTheDocument();
  });

  it("switches to the volume chart and persists the choice", async () => {
    render(<ProgressView data={data} />);
    await userEvent.click(screen.getByRole("tab", { name: "Volume" }));
    expect(
      screen.getByRole("heading", { name: "Total weight moved per session" }),
    ).toBeInTheDocument();
    expect(localStorage.getItem("onyx-progress-metric")).toBe("volume");
  });

  it("switches to the reps chart", async () => {
    render(<ProgressView data={data} />);
    await userEvent.click(screen.getByRole("tab", { name: "Reps" }));
    expect(
      screen.getByRole("heading", { name: "Reps on your heaviest set" }),
    ).toBeInTheDocument();
  });
});
