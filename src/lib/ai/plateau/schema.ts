export const SUGGESTION_KINDS = ["weight", "reps", "rest", "deload"] as const;
export type SuggestionKind = (typeof SUGGESTION_KINDS)[number];

export type PlateauSuggestion = { kind: SuggestionKind; text: string };

export const MAX_SUGGESTION_CHARS = 400;

// The structured outputs format for the suggestion call. The kind enum and
// the text bounds are deliberately absent: validate.ts owns every bound, the
// same split quick entry uses. additionalProperties accepts no value other
// than false.
export const PLATEAU_FORMAT = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      kind: { type: "string" },
      text: { type: "string" },
    },
    required: ["kind", "text"],
    additionalProperties: false,
  },
} as const;
