import { PLATEAU_FORMAT, type PlateauSuggestion } from "@/lib/ai/plateau/schema";
import { PLATEAU_SYSTEM_PROMPT } from "@/lib/ai/plateau/prompt";
import { validateSuggestion } from "@/lib/ai/plateau/validate";

export const PLATEAU_MODEL = "claude-sonnet-5";
export const PLATEAU_MAX_TOKENS = 300;

// The minimal client shape the call needs. The action passes the real
// Anthropic client; tests pass a mock. Structural typing makes both fit.
export type SuggestClient = {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: "user"; content: string }[];
      output_config: { format: typeof PLATEAU_FORMAT };
    }) => Promise<{ content: { type: string; text?: string }[] }>;
  };
};

// null means the model produced nothing usable. Transport errors are not
// caught here: the action maps a throw to its own outcome and copy.
export async function suggestWithModel(
  client: SuggestClient,
  userMessage: string,
): Promise<PlateauSuggestion | null> {
  const response = await client.messages.create({
    model: PLATEAU_MODEL,
    max_tokens: PLATEAU_MAX_TOKENS,
    system: PLATEAU_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userMessage }],
    output_config: { format: PLATEAU_FORMAT },
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block?.text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    return null;
  }
  return validateSuggestion(parsed);
}
