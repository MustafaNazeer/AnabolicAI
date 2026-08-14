// The single definition of both vocabularies.
//
// It lives here rather than in ExercisePicker because the server actions
// validate against the same lists, and a "use server" module must not import
// from a "use client" one. Three consumers now share it: the filter chips,
// the exercise form, and the create and update actions.
export const GROUPS = ["Chest", "Back", "Shoulders", "Legs", "Arms", "Core"];

// Ordered by how broadly useful each value is, not by the CHECK constraint's
// order (which is alphabetical-ish and irrelevant here). Bodyweight moves up
// so it lands inside the roughly four chips that fit a 390px viewport without
// swiping, since it is arguably the most useful value for anyone training at
// home. Other stays last: it is the catch-all, and it means unknown rather
// than a category, which is why the routine builder must never read it as one.
export const EQUIPMENT = [
  "Barbell",
  "Dumbbell",
  "Bodyweight",
  "Machine",
  "Cable",
  "Other",
];

// Narrowing guards rather than bare includes, so a validated value is a
// string to the type checker and the action needs no cast.
export function isMuscleGroup(value: unknown): value is string {
  return typeof value === "string" && GROUPS.includes(value);
}

export function isEquipment(value: unknown): value is string {
  return typeof value === "string" && EQUIPMENT.includes(value);
}
