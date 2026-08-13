import {
  INSIGHTS_FORMAT,
  type DashboardInsights,
} from "@/lib/ai/insights/schema";
import { INSIGHTS_SYSTEM_PROMPT } from "@/lib/ai/insights/prompt";
import { validateInsights } from "@/lib/ai/insights/validate";

export const INSIGHTS_MODEL = "claude-sonnet-5";

// This model runs adaptive thinking by default whenever the thinking param
// is omitted, and max_tokens is a hard cap on thinking plus the response
// text together, not on the response alone. Low effort keeps the common
// case cheap while leaving thinking free to run longer on a messier week.
// The number below is what bounds spend, not what causes it: it is sized so
// thinking never has to compete with the response for room. Same measured
// reasoning as the plateau call.
export const INSIGHTS_MAX_TOKENS = 2000;

// The minimal client shape the call needs. The action passes the real
// Anthropic client; tests pass a mock. Structural typing makes both fit.
export type InsightsClient = {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: "user"; content: string }[];
      output_config: {
        effort: "low" | "medium" | "high" | "xhigh" | "max";
        format: typeof INSIGHTS_FORMAT;
      };
    }) => Promise<{ content: { type: string; text?: string }[] }>;
  };
};

// null means the model produced nothing usable. Transport errors are not
// caught here: the action maps a throw to its own outcome and copy.
export async function insightsWithModel(
  client: InsightsClient,
  userMessage: string,
): Promise<DashboardInsights | null> {
  const response = await client.messages.create({
    model: INSIGHTS_MODEL,
    max_tokens: INSIGHTS_MAX_TOKENS,
    system: INSIGHTS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: { effort: "low", format: INSIGHTS_FORMAT },
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block?.text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    return null;
  }
  return validateInsights(parsed);
}
