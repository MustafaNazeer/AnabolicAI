import { isEquipment, isMuscleGroup } from "@/lib/data/vocabulary";

export type ExerciseFields = {
  name: string;
  muscleGroup: string;
  equipment: string;
};

export type FieldCheck =
  | { ok: true; fields: ExerciseFields }
  | { ok: false; error: string };

// Pure on purpose. The only callers are two server actions, and this project
// does not unit test the data access layer because exercising it meaningfully
// needs a real database rather than a mock. A rule left inside the action
// would therefore ship with nothing asserting it, which is the same trap that
// put session ordering into tested code during the plateau work.
//
// The arguments are unknown rather than string because both actions are
// public server actions: the chips constrain the UI, this constrains the data.
export function checkExerciseFields(
  name: string,
  muscleGroup: unknown,
  equipment: unknown,
): FieldCheck {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter an exercise name." };
  // 200 is exercises_name_length in 0001. Checked here so an over long name
  // returns friendly copy instead of a raw constraint violation.
  if (trimmed.length > 200) {
    return { ok: false, error: "That name is too long." };
  }
  if (!isMuscleGroup(muscleGroup)) {
    return { ok: false, error: "Pick a muscle group." };
  }
  if (!isEquipment(equipment)) {
    return { ok: false, error: "Pick an equipment type." };
  }
  return { ok: true, fields: { name: trimmed, muscleGroup, equipment } };
}
