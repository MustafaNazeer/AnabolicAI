// (next/dynamic and chart mocks copied from ProgressView.metric.test.tsx)
import { it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProgressView } from "@/components/ProgressView";
import type { ProgressData } from "@/lib/progress/types";

vi.mock("@/lib/ai/plateau/actions", () => ({
  suggestForPlateau: vi.fn(),
  setAiPlateau: vi.fn(),
}));

function series(e1rms: number[]): ProgressData {
  const now = Date.now();
  return {
    exercises: [{ id: "ex-1", name: "Bench Press" }],
    series: {
      "ex-1": e1rms.map((e1rm, i) => ({
        sessionId: `s-${i}`,
        date: new Date(now - (e1rms.length - 1 - i) * 4 * 86_400_000).toISOString(),
        maxWeight: e1rm,
        e1rm,
        volume: 1000,
        topSetReps: 5,
      })),
    },
  };
}

const EMPTY_VOLUME = { routines: [], series: {} };

it("offers a suggestion when the selected lift is stalled", () => {
  render(
    <ProgressView
      data={series([185, 185, 185, 185])}
      routineVolume={EMPTY_VOLUME}
      goals={{}}
      aiPlateau={true}
    />,
  );
  expect(
    screen.getByRole("button", { name: "What should I try?" }),
  ).toBeInTheDocument();
});

it("stays silent when the lift is improving", () => {
  render(
    <ProgressView
      data={series([135, 140, 140, 145])}
      routineVolume={EMPTY_VOLUME}
      goals={{}}
      aiPlateau={true}
    />,
  );
  expect(
    screen.queryByRole("button", { name: "What should I try?" }),
  ).not.toBeInTheDocument();
});
