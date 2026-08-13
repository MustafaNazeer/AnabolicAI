// (next/dynamic and chart mocks copied from ProgressView.metric.test.tsx)
import { it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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

// Switching exercises must actually replace the card. This is a regression
// test for a real defect: PlateauCard and GoalCard are siblings and both were
// keyed on the selected exercise, so React saw two children with the same key,
// could not tell them apart, and left the previous card's DOM in place. The
// symptom on the device was the consent notice staying on screen after the
// exercise changed, under a lift that was not even stalled.
function twoLifts(): ProgressData {
  const now = Date.now();
  const pts = (vals: number[]) =>
    vals.map((e1rm, i) => ({
      sessionId: `s-${i}`,
      date: new Date(now - (vals.length - 1 - i) * 4 * 86_400_000).toISOString(),
      maxWeight: e1rm,
      e1rm,
      volume: 1000,
      topSetReps: 5,
    }));
  return {
    exercises: [
      { id: "ex-stalled", name: "T Bar" },
      { id: "ex-improving", name: "Machine Chest Press" },
    ],
    series: {
      "ex-stalled": pts([180, 180, 180, 180]),
      "ex-improving": pts([135, 140, 140, 145]),
    },
  };
}

it("replaces the card when the exercise changes", () => {
  render(
    <ProgressView
      data={twoLifts()}
      routineVolume={EMPTY_VOLUME}
      goals={{}}
      aiPlateau={true}
    />,
  );
  expect(
    screen.getByText(/Your estimated max on T Bar/),
  ).toBeInTheDocument();

  fireEvent.change(screen.getAllByRole("combobox")[0], {
    target: { value: "ex-improving" },
  });

  // The newly selected lift is improving, so no card at all should remain.
  expect(screen.queryByText(/Your estimated max on T Bar/)).not.toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "What should I try?" }),
  ).not.toBeInTheDocument();
});

it("keys its cards uniquely, so React never sees duplicate sibling keys", () => {
  const warnings: string[] = [];
  const original = console.error;
  console.error = (...args: unknown[]) => {
    warnings.push(args.map(String).join(" "));
  };
  try {
    render(
      <ProgressView
        data={twoLifts()}
        routineVolume={EMPTY_VOLUME}
        goals={{}}
        aiPlateau={true}
      />,
    );
    fireEvent.change(screen.getAllByRole("combobox")[0], {
      target: { value: "ex-improving" },
    });
  } finally {
    console.error = original;
  }
  expect(warnings.filter((w) => w.includes("same key"))).toEqual([]);
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
