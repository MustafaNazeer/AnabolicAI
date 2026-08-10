import { QUICK_ENTRY_FORMAT, type ParsedSet } from "@/lib/ai/schema";
import { QUICK_ENTRY_SYSTEM_PROMPT } from "@/lib/ai/prompt";
import { validateParsedSets } from "@/lib/ai/validate";

export const QUICK_ENTRY_MODEL = "claude-haiku-4-5";
export const QUICK_ENTRY_MAX_TOKENS = 1000;

// The minimal client shape the call needs. The action passes the real
// Anthropic client; tests pass a mock. Structural typing makes both fit.
export type ParseClient = {
  messages: {
    create: (params: {
      model: string;
      max_tokens: number;
      system: string;
      messages: { role: "user"; content: string }[];
      output_config: { format: typeof QUICK_ENTRY_FORMAT };
    }) => Promise<{ content: { type: string; text?: string }[] }>;
  };
};

// null means the model produced nothing usable (no text block, non JSON, out
// of schema, out of bounds, or an empty set list). Transport errors are not
// caught here: the action maps a throw to its own outcome and copy.
export async function parseWithModel(
  client: ParseClient,
  text: string,
): Promise<ParsedSet[] | null> {
  const response = await client.messages.create({
    model: QUICK_ENTRY_MODEL,
    max_tokens: QUICK_ENTRY_MAX_TOKENS,
    system: QUICK_ENTRY_SYSTEM_PROMPT,
    messages: [{ role: "user", content: text }],
    output_config: { format: QUICK_ENTRY_FORMAT },
  });
  const block = response.content.find((b) => b.type === "text");
  if (!block?.text) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(block.text);
  } catch {
    return null;
  }
  return validateParsedSets(parsed);
}
