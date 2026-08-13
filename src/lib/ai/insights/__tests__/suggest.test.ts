import { describe, it, expect, vi } from "vitest";
import {
  insightsWithModel,
  INSIGHTS_MODEL,
  INSIGHTS_MAX_TOKENS,
} from "@/lib/ai/insights/suggest";
import { INSIGHTS_FORMAT } from "@/lib/ai/insights/schema";
import { INSIGHTS_SYSTEM_PROMPT } from "@/lib/ai/insights/prompt";

function clientReturning(text: string | undefined) {
  const create = vi.fn(async () => ({
    content: text === undefined ? [] : [{ type: "text", text }],
  }));
  return { client: { messages: { create } }, create };
}

describe("insightsWithModel", () => {
  it("sends the pinned model, budget, system prompt, and format", async () => {
    const { client, create } = clientReturning(
      '{"insights":["Bench is holding steady."]}',
    );
    await insightsWithModel(client, "the user message");
    expect(create).toHaveBeenCalledWith({
      model: INSIGHTS_MODEL,
      max_tokens: INSIGHTS_MAX_TOKENS,
      system: INSIGHTS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: "the user message" }],
      output_config: { effort: "low", format: INSIGHTS_FORMAT },
    });
  });

  it("returns the validated insights", async () => {
    const { client } = clientReturning('{"insights":["One.","Two."]}');
    await expect(insightsWithModel(client, "m")).resolves.toEqual({
      insights: ["One.", "Two."],
    });
  });

  it("returns null when the response holds no text block", async () => {
    const { client } = clientReturning(undefined);
    await expect(insightsWithModel(client, "m")).resolves.toBeNull();
  });

  it("returns null on unparseable JSON", async () => {
    const { client } = clientReturning("not json");
    await expect(insightsWithModel(client, "m")).resolves.toBeNull();
  });

  it("returns null when validation rejects the shape", async () => {
    const { client } = clientReturning('{"insights":[]}');
    await expect(insightsWithModel(client, "m")).resolves.toBeNull();
  });
});
