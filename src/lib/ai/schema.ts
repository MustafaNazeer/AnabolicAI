export const MAX_QUICK_ENTRY_CHARS = 300;
export const MAX_PARSED_SETS = 10;

export type ParsedSet = {
  reps: number;
  weight: number;
  rirLow: number | null;
  rirHigh: number | null;
};

// The structured outputs format for the parse call. Bounds (reps at least 1,
// RIR 0 through 5, set count at most 10) are deliberately absent: structured
// outputs reject numeric and array constraints, so validate.ts owns every
// bound. additionalProperties accepts no value other than false.
export const QUICK_ENTRY_FORMAT = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      sets: {
        type: "array",
        items: {
          type: "object",
          properties: {
            reps: { type: "integer" },
            weight: { type: "number" },
            rirLow: { type: ["integer", "null"] },
            rirHigh: { type: ["integer", "null"] },
          },
          required: ["reps", "weight", "rirLow", "rirHigh"],
          additionalProperties: false,
        },
      },
    },
    required: ["sets"],
    additionalProperties: false,
  },
} as const;
