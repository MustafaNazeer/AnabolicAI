import { describe, it, expect } from "vitest";
import { moveItem, filterExercises } from "@/lib/routines/edit";
import type { Exercise } from "@/lib/data/types";

const ex = (
  name: string,
  muscle_group: string | null = null,
  equipment: string | null = null,
): Exercise => ({
  id: name,
  name,
  muscle_group,
  equipment,
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
  const list = [
    ex("Bench Press", "Chest", "Barbell"),
    ex("Squat", "Legs", "Barbell"),
    ex("Incline Bench Press", "Chest", "Barbell"),
    ex("Leg Curl", "Legs", "Machine"),
    ex("My Home Move", null, null),
  ];

  it("returns everything when nothing is asked for", () => {
    expect(filterExercises(list, {})).toHaveLength(5);
    expect(filterExercises(list, { query: "  " })).toHaveLength(5);
  });

  it("matches by name case insensitively", () => {
    expect(filterExercises(list, { query: "bench" }).map((e) => e.name)).toEqual([
      "Bench Press",
      "Incline Bench Press",
    ]);
  });

  it("filters by muscle group alone", () => {
    expect(filterExercises(list, { group: "Legs" }).map((e) => e.name)).toEqual([
      "Squat",
      "Leg Curl",
    ]);
  });

  it("filters by equipment alone", () => {
    expect(
      filterExercises(list, { equipment: "Machine" }).map((e) => e.name),
    ).toEqual(["Leg Curl"]);
  });

  it("composes all three", () => {
    expect(
      filterExercises(list, {
        query: "leg",
        group: "Legs",
        equipment: "Machine",
      }).map((e) => e.name),
    ).toEqual(["Leg Curl"]);
  });

  // An exercise the user added has no equipment, because the app genuinely does
  // not know what it uses. It belongs under All and under no specific chip.
  it("shows an exercise with no equipment under All but under no equipment chip", () => {
    expect(filterExercises(list, {}).map((e) => e.name)).toContain(
      "My Home Move",
    );
    expect(
      filterExercises(list, { equipment: "Barbell" }).map((e) => e.name),
    ).not.toContain("My Home Move");
  });

  it("does the same for a missing muscle group", () => {
    expect(
      filterExercises(list, { group: "Chest" }).map((e) => e.name),
    ).not.toContain("My Home Move");
  });

  it("returns an empty list when nothing matches", () => {
    expect(filterExercises(list, { query: "zzz" })).toEqual([]);
  });

  // null and undefined both mean "no filter on this dimension", because the
  // component clears a chip by setting it to null.
  it("treats a null dimension as no filter", () => {
    expect(
      filterExercises(list, { group: null, equipment: null }),
    ).toHaveLength(5);
  });
});
