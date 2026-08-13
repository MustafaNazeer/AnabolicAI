import { describe, it, expect, vi } from "vitest";
import {
  suggestWithModel,
  PLATEAU_MODEL,
  PLATEAU_MAX_TOKENS,
  type SuggestClient,
} from "@/lib/ai/plateau/suggest";
import { PLATEAU_FORMAT } from "@/lib/ai/plateau/schema";
import { PLATEAU_SYSTEM_PROMPT } from "@/lib/ai/plateau/prompt";

function clientReturning(text: string | undefined): {
  client: SuggestClient;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => ({
    content: text === undefined ? [] : [{ type: "text", text }],
  }));
  return { client: { messages: { create } }, create };
}

describe("suggestWithModel", () => {
  it("returns the validated suggestion and sends the fixed parameters", async () => {
    const { client, create } = clientReturning(
      JSON.stringify({ kind: "weight", text: "Add five pounds next session." }),
    );
    await expect(suggestWithModel(client, "Lift: Bench")).resolves.toEqual({
      kind: "weight",
      text: "Add five pounds next session.",
    });
    expect(create).toHaveBeenCalledWith({
      model: PLATEAU_MODEL,
      max_tokens: PLATEAU_MAX_TOKENS,
      system: PLATEAU_SYSTEM_PROMPT,
      messages: [{ role: "user", content: "Lift: Bench" }],
      output_config: { effort: "low", format: PLATEAU_FORMAT },
    });
  });

  it("returns null when there is no text block", async () => {
    const { client } = clientReturning(undefined);
    await expect(suggestWithModel(client, "x")).resolves.toBeNull();
  });

  it("returns null on non JSON output", async () => {
    const { client } = clientReturning("try harder");
    await expect(suggestWithModel(client, "x")).resolves.toBeNull();
  });

  it("returns null on out of schema output", async () => {
    const { client } = clientReturning(
      JSON.stringify({ kind: "form", text: "Fix your arch." }),
    );
    await expect(suggestWithModel(client, "x")).resolves.toBeNull();
  });

  it("pins the model and the token budget", () => {
    expect(PLATEAU_MODEL).toBe("claude-sonnet-5");
    expect(PLATEAU_MAX_TOKENS).toBe(2000);
  });

  it("lets a transport error propagate to the caller", async () => {
    const create = vi.fn().mockRejectedValue(new Error("529 overloaded"));
    const client = { messages: { create } } as unknown as SuggestClient;
    await expect(suggestWithModel(client, "x")).rejects.toThrow("529 overloaded");
  });
});
