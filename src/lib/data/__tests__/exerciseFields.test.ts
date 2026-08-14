import { describe, it, expect } from "vitest";
import { checkExerciseFields } from "@/lib/data/exerciseFields";

describe("checkExerciseFields", () => {
  it("accepts a trimmed name with both values in vocabulary", () => {
    expect(checkExerciseFields("  Incline Press  ", "Chest", "Machine")).toEqual(
      {
        ok: true,
        fields: {
          name: "Incline Press",
          muscleGroup: "Chest",
          equipment: "Machine",
        },
      },
    );
  });

  it("rejects an empty name", () => {
    expect(checkExerciseFields("   ", "Chest", "Machine")).toEqual({
      ok: false,
      error: "Enter an exercise name.",
    });
  });

  // Matches exercises_name_length in 0001, so the app refuses before the
  // database does and the user gets copy rather than a Postgres error.
  it("rejects a name over 200 characters", () => {
    const result = checkExerciseFields("a".repeat(201), "Chest", "Machine");
    expect(result).toEqual({
      ok: false,
      error: "That name is too long.",
    });
  });

  it("accepts a name of exactly 200 characters", () => {
    const result = checkExerciseFields("a".repeat(200), "Chest", "Machine");
    expect(result.ok).toBe(true);
  });

  // The chips can never produce these. A crafted request to the server
  // action can, which is the whole reason this runs server side too.
  it("rejects a muscle group outside the vocabulary", () => {
    expect(checkExerciseFields("Pec Deck", "Pecs", "Machine")).toEqual({
      ok: false,
      error: "Pick a muscle group.",
    });
  });

  it("rejects a muscle group differing only in case", () => {
    expect(checkExerciseFields("Pec Deck", "chest", "Machine")).toEqual({
      ok: false,
      error: "Pick a muscle group.",
    });
  });

  it("rejects equipment outside the vocabulary", () => {
    expect(checkExerciseFields("Pec Deck", "Chest", "Kettlebell")).toEqual({
      ok: false,
      error: "Pick an equipment type.",
    });
  });

  it("rejects a null muscle group, which is what untagged customs carry", () => {
    expect(checkExerciseFields("Pec Deck", null, "Machine")).toEqual({
      ok: false,
      error: "Pick a muscle group.",
    });
  });
});
