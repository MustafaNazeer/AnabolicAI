import { render } from "@testing-library/react";
import { axe } from "jest-axe";
import { describe, it, expect, vi } from "vitest";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import type { LastSet } from "@/lib/workout/types";
import type { LocalSet } from "@/lib/offline/store";

// The logging card is the app's most complex form: five controls on one input
// row, a reps in reserve pair sharing a group, a quick fill button whose name is
// built at render time, and per set delete buttons. It carried no axe coverage
// until an accessible name defect got through review, so it has some now.
//
// Verified to have teeth: removing the log button's aria-label makes two of the
// three cases fail on "Buttons must have discernible text".
//
// Two limits worth knowing before trusting this. jsdom performs no layout and
// loads no stylesheet, so nothing here checks colour contrast or touch target
// size. And axe cannot detect WCAG 2.5.3 Label in Name, which is the exact
// defect that prompted these tests, because comparing a visible label to an
// accessible name is not automatable. Both still need a human or a device.

const lastSets: LastSet[] = [
  { set_number: 1, reps: 8, weight: 135, rirLow: 0, rirHigh: 1 },
];

const loggedSets: LocalSet[] = [
  {
    id: "s1",
    sessionId: "sess1",
    exerciseId: "ex1",
    setNumber: 1,
    reps: 8,
    weight: 135,
    rirLow: 0,
    rirHigh: 1,
    syncState: "synced",
  },
  {
    id: "s2",
    sessionId: "sess1",
    exerciseId: "ex1",
    setNumber: 2,
    reps: 6,
    weight: 145,
    rirLow: null,
    rirHigh: null,
    syncState: "pending",
  },
];

describe("ExerciseLogCard accessibility", () => {
  it("has no axe violations while logging", async () => {
    const { container } = render(
      <ExerciseLogCard
        exerciseName="Bench Press"
        defaultSets={3}
        loggedSets={loggedSets}
        lastSets={lastSets}
        onLog={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations as a swapped in replacement", async () => {
    const { container } = render(
      <ExerciseLogCard
        exerciseName="Barbell Bench"
        defaultSets={3}
        loggedSets={[]}
        lastSets={[]}
        onLog={vi.fn()}
        onDelete={vi.fn()}
        role="replacement"
        originalName="Pec Deck"
        onSwap={vi.fn()}
        onUndoSwap={vi.fn()}
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it("has no axe violations as a read only swapped out card", async () => {
    const { container } = render(
      <ExerciseLogCard
        exerciseName="Pec Deck"
        defaultSets={3}
        loggedSets={loggedSets}
        lastSets={lastSets}
        onLog={vi.fn()}
        onDelete={vi.fn()}
        role="swappedOutOriginal"
      />,
    );
    expect(await axe(container)).toHaveNoViolations();
  });
});
