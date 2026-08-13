export type DashboardInsights = { insights: string[] };

export const MAX_INSIGHTS = 3;
export const MAX_INSIGHT_CHARS = 200;

// The structured outputs format for the insights call. The count and length
// bounds are deliberately absent: validate.ts owns every bound, the same
// split quick entry and plateau use. additionalProperties accepts no value
// other than false.
export const INSIGHTS_FORMAT = {
  type: "json_schema",
  schema: {
    type: "object",
    properties: {
      insights: { type: "array", items: { type: "string" } },
    },
    required: ["insights"],
    additionalProperties: false,
  },
} as const;
