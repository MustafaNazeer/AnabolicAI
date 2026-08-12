import { describe, it, expect } from "vitest";
import {
  PLATEAU_SYSTEM_PROMPT,
  buildPlateauMessage,
  type PlateauContext,
} from "@/lib/ai/plateau/prompt";

const CTX: PlateauContext = {
  exerciseName: "Bench Press",
  muscleGroup: "chest",
  restSeconds: 120,
  sessions: [
    {
      daysAgo: 12,
      sets: [
        { reps: 8, weight: 135, rirLow: 1, rirHigh: 2 },
        { reps: 8, weight: 135, rirLow: null, rirHigh: null },
      ],
    },
    { daysAgo: 1, sets: [{ reps: 7, weight: 135, rirLow: 2, rirHigh: 2 }] },
  ],
};

describe("buildPlateauMessage", () => {
  it("renders the lift, rest, and each session as relative days", () => {
    const msg = buildPlateauMessage(CTX);
    expect(msg).toContain("Lift: Bench Press (chest)");
    expect(msg).toContain("Default rest: 120 seconds");
    expect(msg).toContain("12 days ago: 135 x 8 (RIR 1-2), 135 x 8");
    expect(msg).toContain("1 day ago: 135 x 7 (RIR 2)");
  });

  it("says today for a session zero days old", () => {
    const msg = buildPlateauMessage({
      ...CTX,
      sessions: [{ daysAgo: 0, sets: [{ reps: 5, weight: 185, rirLow: null, rirHigh: null }] }],
    });
    expect(msg).toContain("today: 185 x 5");
  });

  it("omits the muscle group clause when there is none", () => {
    const msg = buildPlateauMessage({ ...CTX, muscleGroup: null });
    expect(msg).toContain("Lift: Bench Press\n");
    expect(msg).not.toContain("(chest)");
  });

  it("keeps sessions in the order given, oldest first", () => {
    const msg = buildPlateauMessage(CTX);
    expect(msg.indexOf("12 days ago")).toBeLessThan(msg.indexOf("1 day ago"));
  });

  it("contains no absolute date and no identifier", () => {
    const msg = buildPlateauMessage(CTX);
    expect(msg).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(PLATEAU_SYSTEM_PROMPT).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    const withExtra = { ...CTX, userId: "user-abcdef-123456" } as unknown as PlateauContext;
    expect(buildPlateauMessage(withExtra)).not.toContain("user-abcdef-123456");
  });

  it("constrains the answer to one change and two sentences", () => {
    expect(PLATEAU_SYSTEM_PROMPT).toContain("exactly one change");
    expect(PLATEAU_SYSTEM_PROMPT).toContain("At most two sentences");
    expect(PLATEAU_SYSTEM_PROMPT).toContain("at most 10 percent");
  });

  it("collapses newlines in exercise names to a single line", () => {
    const nameWithNewline = "Bench\nPress";
    const msg = buildPlateauMessage({ ...CTX, exerciseName: nameWithNewline });
    const lineCount = msg.split("\n").length;
    const msgNormal = buildPlateauMessage(CTX);
    const lineCountNormal = msgNormal.split("\n").length;
    expect(lineCount).toBe(lineCountNormal);
  });

  it("truncates exercise names longer than 80 characters", () => {
    const longName = "A".repeat(100);
    const msg = buildPlateauMessage({ ...CTX, exerciseName: longName });
    expect(msg).toContain("A".repeat(80));
    expect(msg).not.toContain("A".repeat(81));
  });
});
