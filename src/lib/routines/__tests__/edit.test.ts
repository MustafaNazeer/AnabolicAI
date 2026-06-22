import { describe, it, expect } from "vitest";
import { moveItem, filterExercises } from "@/lib/routines/edit";
import type { Exercise } from "@/lib/data/types";

const ex = (name: string): Exercise => ({
  id: name,
  name,
  muscle_group: null,
  is_default: true,
});

describe("moveItem", () => {
  it("moves an item up", () => {
    expect(moveItem(["a", "b", "c"], 1, "up")).toEqual(["b", "a", "c"]);
  });
  it("moves an item down", () => {
    expect(moveItem(["a", "b", "c"], 1, "down")).toEqual(["a", "c", "b"]);
  });
  it("is a no-op at the boundaries", () => {
    expect(moveItem(["a", "b"], 0, "up")).toEqual(["a", "b"]);
    expect(moveItem(["a", "b"], 1, "down")).toEqual(["a", "b"]);
  });
});

describe("filterExercises", () => {
  const list = [ex("Bench Press"), ex("Squat"), ex("Incline Bench Press")];
  it("returns everything for an empty query", () => {
    expect(filterExercises(list, "  ")).toHaveLength(3);
  });
  it("matches by name case-insensitively", () => {
    expect(filterExercises(list, "bench").map((e) => e.name)).toEqual([
      "Bench Press",
      "Incline Bench Press",
    ]);
  });
});
