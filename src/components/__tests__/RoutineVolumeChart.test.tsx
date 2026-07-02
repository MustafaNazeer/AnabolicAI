import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoutineVolumeChart } from "@/components/RoutineVolumeChart";
import type { RoutineVolumePoint } from "@/lib/progress/types";

const exercises = [
  { id: "bench", name: "Bench Press" },
  { id: "ohp", name: "Overhead Press" },
];
const points: RoutineVolumePoint[] = [
  { sessionId: "s1", date: "2026-06-01", total: 800, byExercise: { bench: 500, ohp: 300 } },
  { sessionId: "s2", date: "2026-06-08", total: 900, byExercise: { bench: 600, ohp: 300 } },
];

describe("RoutineVolumeChart", () => {
  it("lists each exercise in an accessible legend", () => {
    render(<RoutineVolumeChart exercises={exercises} points={points} />);
    const legend = screen.getByRole("list", { name: "Exercises" });
    expect(legend).toHaveTextContent("Bench Press");
    expect(legend).toHaveTextContent("Overhead Press");
  });
});
