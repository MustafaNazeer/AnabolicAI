import { describe, it, expect, vi, beforeEach } from "vitest";

const { checkMock } = vi.hoisted(() => ({ checkMock: vi.fn() }));

// Only the limiter is mocked. Everything else the route imports loads fine
// under jsdom and is never reached, because both cases return before the
// signature verifier is ever built.
vi.mock("@/lib/security/rateLimit", () => ({
  checkRateLimit: checkMock,
  clientIpFrom: () => "1.2.3.4",
}));

import { POST } from "../route";

const post = () =>
  POST(
    new Request("https://example.com/api/rest/complete", {
      method: "POST",
      body: JSON.stringify({ sessionId: "s", token: "t" }),
    }),
  );

// Without this the limiter could be dropped from the route entirely and all
// seven CI checks would stay green. The pure decision helper in
// src/lib/security/rateLimit.ts is well covered; what was untested is that
// this endpoint asks it anything at all.
describe("POST /api/rest/complete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STORAGE_QSTASH_CURRENT_SIGNING_KEY;
    delete process.env.STORAGE_QSTASH_NEXT_SIGNING_KEY;
  });

  it("asks the limiter about this surface before doing anything else", async () => {
    checkMock.mockResolvedValue(true);
    await post();
    expect(checkMock).toHaveBeenCalledWith("restComplete", "1.2.3.4");
  });

  it("answers 429 and never verifies a signature when the limiter blocks", async () => {
    checkMock.mockResolvedValue(false);
    const response = await post();
    expect(response.status).toBe(429);
  });

  // The counterpart. A limiter that allows must not itself become the reason
  // the request stops, or the first test above would pass against a route
  // that rejects everything.
  it("gets past an allowing limiter to the unconfigured 503", async () => {
    checkMock.mockResolvedValue(true);
    const response = await post();
    expect(response.status).toBe(503);
  });
});
