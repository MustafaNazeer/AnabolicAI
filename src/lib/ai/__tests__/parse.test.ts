import { describe, it, expect, vi } from "vitest";
import {
  parseWithModel,
  QUICK_ENTRY_MODEL,
  type ParseClient,
} from "@/lib/ai/parse";
import { QUICK_ENTRY_FORMAT } from "@/lib/ai/schema";

function clientReturning(text: string | null): {
  client: ParseClient;
  create: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn().mockResolvedValue({
    content: text === null ? [] : [{ type: "text", text }],
  });
  return { client: { messages: { create } } as ParseClient, create };
}

describe("parseWithModel", () => {
  it("sends the text as the user message with the pinned model and format", async () => {
    const { client, create } = clientReturning(
      JSON.stringify({
        sets: [{ reps: 5, weight: 185, rirLow: null, rirHigh: null }],
      }),
    );
    await parseWithModel(client, "185 for 5");
    expect(create).toHaveBeenCalledTimes(1);
    const params = create.mock.calls[0][0];
    expect(params.model).toBe(QUICK_ENTRY_MODEL);
    expect(params.messages).toEqual([{ role: "user", content: "185 for 5" }]);
    expect(params.output_config).toEqual({ format: QUICK_ENTRY_FORMAT });
  });

  it("returns the validated sets on a good response", async () => {
    const { client } = clientReturning(
      JSON.stringify({
        sets: [
          { reps: 5, weight: 185, rirLow: 2, rirHigh: 2 },
          { reps: 4, weight: 185, rirLow: 2, rirHigh: 2 },
        ],
      }),
    );
    await expect(parseWithModel(client, "x")).resolves.toEqual([
      { reps: 5, weight: 185, rirLow: 2, rirHigh: 2 },
      { reps: 4, weight: 185, rirLow: 2, rirHigh: 2 },
    ]);
  });

  it("returns null when there is no text block", async () => {
    const { client } = clientReturning(null);
    await expect(parseWithModel(client, "x")).resolves.toBeNull();
  });

  it("returns null on non JSON text", async () => {
    const { client } = clientReturning("sorry, I cannot");
    await expect(parseWithModel(client, "x")).resolves.toBeNull();
  });

  // The teeth: schema conformant JSON with numbers logSet would reject must
  // come back null, because structured outputs cannot carry numeric bounds.
  it("returns null when the JSON is in schema but out of bounds", async () => {
    const { client } = clientReturning(
      JSON.stringify({
        sets: [{ reps: 0, weight: -5, rirLow: null, rirHigh: null }],
      }),
    );
    await expect(parseWithModel(client, "x")).resolves.toBeNull();
  });

  it("lets a transport error propagate to the caller", async () => {
    const create = vi.fn().mockRejectedValue(new Error("529 overloaded"));
    const client = { messages: { create } } as unknown as ParseClient;
    await expect(parseWithModel(client, "x")).rejects.toThrow("529 overloaded");
  });
});
