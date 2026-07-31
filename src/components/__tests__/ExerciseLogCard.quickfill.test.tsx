import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExerciseLogCard } from "@/components/ExerciseLogCard";
import type { LastSet } from "@/lib/workout/types";
import type { LocalSet } from "@/lib/offline/store";

function makeLoggedSets(count: number): LocalSet[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `s${i + 1}`,
    sessionId: "sess1",
    exerciseId: "ex1",
    setNumber: i + 1,
    reps: 8,
    weight: 135,
    rirLow: 2,
    rirHigh: 2,
    syncState: "synced" as const,
  }));
}

const lastSets: LastSet[] = [
  { set_number: 1, reps: 8, weight: 135, rirLow: 2, rirHigh: 2 },
  { set_number: 2, reps: 6, weight: 145, rirLow: 1, rirHigh: 1 },
];

const rangeLastSets: LastSet[] = [
  { set_number: 1, reps: 8, weight: 135, rirLow: 0, rirHigh: 1 },
];

const noRirLastSets: LastSet[] = [
  { set_number: 1, reps: 8, weight: 135, rirLow: null, rirHigh: null },
];

function renderCard(
  loggedSets: LocalSet[],
  last: LastSet[] = lastSets,
  handlers: { onLog?: (i: unknown) => void; onDelete?: (id: string) => void } = {},
) {
  return render(
    <ExerciseLogCard
      exerciseName="Bench Press"
      defaultSets={3}
      loggedSets={loggedSets}
      lastSets={last}
      onLog={handlers.onLog ?? (() => {})}
      onDelete={handlers.onDelete ?? (() => {})}
    />,
  );
}

describe("ExerciseLogCard quick fill", () => {
  it("fills both empty fields with the matched set on tap", async () => {
    renderCard(makeLoggedSets(0));
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("135");
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("8");
  });

  it("matches by set number for later sets", async () => {
    renderCard(makeLoggedSets(1));
    await userEvent.click(screen.getByRole("button", { name: /fill set 2/i }));
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("145");
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("6");
  });

  it("does not clobber a value the user already typed", async () => {
    renderCard(makeLoggedSets(0));
    const weightInput = screen.getByRole("textbox", { name: "Weight" });
    await userEvent.type(weightInput, "999");
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    expect(weightInput).toHaveValue("999");
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("8");
  });

  it("renders the reference as plain text with no button when there is no history", () => {
    renderCard(makeLoggedSets(0), []);
    expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /fill set/i })).toBeNull();
  });

  it("names the matched reps, weight and RIR in the aria-label", () => {
    renderCard(makeLoggedSets(1));
    expect(
      screen.getByRole("button", {
        name: "Fill set 2 with last time, 6 reps for 145 pounds, 1 RIR",
      }),
    ).toBeInTheDocument();
  });

  it("does not change either field when both are already filled", async () => {
    renderCard(makeLoggedSets(0));
    await userEvent.type(screen.getByRole("textbox", { name: "Weight" }), "200");
    await userEvent.type(screen.getByRole("textbox", { name: "Reps" }), "5");
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("200");
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("5");
  });

  it("fills RIR from the previous set when both boxes are empty", async () => {
    renderCard(makeLoggedSets(0));
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    expect(screen.getByRole("textbox", { name: "RIR" })).toHaveValue("2");
    expect(screen.getByRole("textbox", { name: "to, highest reps in reserve" })).toHaveValue("");
  });

  it("fills both boxes when the previous set recorded a range", async () => {
    renderCard(makeLoggedSets(0), rangeLastSets);
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    expect(screen.getByRole("textbox", { name: "RIR" })).toHaveValue("0");
    expect(screen.getByRole("textbox", { name: "to, highest reps in reserve" })).toHaveValue("1");
  });

  it("leaves a typed RIR alone while still filling reps and weight", async () => {
    renderCard(makeLoggedSets(0));
    await userEvent.type(screen.getByRole("textbox", { name: "RIR" }), "4");
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    expect(screen.getByRole("textbox", { name: "RIR" })).toHaveValue("4");
    expect(screen.getByRole("textbox", { name: "to, highest reps in reserve" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("8");
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("135");
  });

  it("leaves a typed upper box alone while still filling reps and weight", async () => {
    renderCard(makeLoggedSets(0));
    await userEvent.type(
      screen.getByRole("textbox", { name: "to, highest reps in reserve" }),
      "4",
    );
    await userEvent.click(screen.getByRole("button", { name: /fill set 1/i }));
    expect(screen.getByRole("textbox", { name: "RIR" })).toHaveValue("");
    expect(
      screen.getByRole("textbox", { name: "to, highest reps in reserve" }),
    ).toHaveValue("4");
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("8");
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("135");
  });

  it("names the previous RIR in the reference line", () => {
    renderCard(makeLoggedSets(0));
    expect(
      screen.getByText("Last time: 8 for 135 lbs, 2 RIR"),
    ).toBeInTheDocument();
  });

  it("omits the RIR clause when the previous set recorded none", () => {
    renderCard(makeLoggedSets(0), noRirLastSets);
    expect(
      screen.getByRole("button", {
        name: "Fill set 1 with last time, 8 reps for 135 pounds",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Last time: 8 for 135 lbs")).toBeInTheDocument();
  });
});

describe("ExerciseLogCard logging", () => {
  it("calls onLog with the entered values and clears the fields", async () => {
    const onLog = vi.fn();
    renderCard(makeLoggedSets(0), lastSets, { onLog });
    await userEvent.type(screen.getByRole("textbox", { name: "Weight" }), "185");
    await userEvent.type(screen.getByRole("textbox", { name: "Reps" }), "5");
    await userEvent.type(screen.getByRole("textbox", { name: "RIR" }), "0");
    await userEvent.type(
      screen.getByRole("textbox", { name: "to, highest reps in reserve" }),
      "1",
    );
    await userEvent.click(screen.getByRole("button", { name: "Log set" }));
    expect(onLog).toHaveBeenCalledWith({
      reps: 5,
      weight: 185,
      rirLow: 0,
      rirHigh: 1,
    });
    expect(screen.getByRole("textbox", { name: "Weight" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Reps" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "RIR" })).toHaveValue("");
    expect(
      screen.getByRole("textbox", { name: "to, highest reps in reserve" }),
    ).toHaveValue("");
  });

  it("rejects reps below 1 without calling onLog", async () => {
    const onLog = vi.fn();
    renderCard(makeLoggedSets(0), lastSets, { onLog });
    await userEvent.type(screen.getByRole("textbox", { name: "Weight" }), "100");
    await userEvent.type(screen.getByRole("textbox", { name: "Reps" }), "0");
    await userEvent.click(screen.getByRole("button", { name: "Log set" }));
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/reps must be at least 1/i);
  });

  it("marks unsynced sets with a pending indicator", () => {
    const sets = makeLoggedSets(1);
    sets[0].syncState = "pending";
    renderCard(sets);
    expect(screen.getByRole("img", { name: /not yet synced/i })).toBeInTheDocument();
  });

  it("calls onDelete with the set id", async () => {
    const onDelete = vi.fn();
    renderCard(makeLoggedSets(1), lastSets, { onDelete });
    await userEvent.click(screen.getByRole("button", { name: "Delete set 1" }));
    expect(onDelete).toHaveBeenCalledWith("s1");
  });
});
