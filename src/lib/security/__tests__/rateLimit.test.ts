import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { limitMock, ratelimitCtor } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  ratelimitCtor: vi.fn(),
}));

vi.mock("@upstash/redis", () => ({ Redis: vi.fn() }));
vi.mock("@upstash/ratelimit", () => {
  // The implementation is a function expression rather than an arrow because
  // the helper calls `new Ratelimit(...)`, and Vitest only lets a mock stand in
  // as a constructor when its implementation is constructible.
  const Ratelimit = ratelimitCtor.mockImplementation(function () {
    return { limit: limitMock };
  }) as unknown as { slidingWindow: unknown } & typeof ratelimitCtor;
  Ratelimit.slidingWindow = vi.fn(() => ({}));
  return { Ratelimit };
});

import {
  checkRateLimit,
  clientIpFrom,
  resetRateLimiting,
} from "@/lib/security/rateLimit";

// The names the Vercel integration provisioned for the Upstash Redis resource.
const URL_ENV = "KV_REST_API_URL";
const TOKEN_ENV = "KV_REST_API_TOKEN";

describe("clientIpFrom", () => {
  it("takes the leftmost forwarded entry, which Vercel sets to the client", () => {
    expect(clientIpFrom("1.2.3.4")).toBe("1.2.3.4");
    expect(clientIpFrom("1.2.3.4, 5.6.7.8")).toBe("1.2.3.4");
    expect(clientIpFrom(" 1.2.3.4 , 5.6.7.8")).toBe("1.2.3.4");
  });

  it("answers unknown rather than an empty key when the header is missing", () => {
    expect(clientIpFrom(null)).toBe("unknown");
    expect(clientIpFrom("")).toBe("unknown");
  });
});

describe("checkRateLimit", () => {
  beforeEach(() => {
    resetRateLimiting();
    vi.clearAllMocks();
  });

  afterEach(() => {
    delete process.env[URL_ENV];
    delete process.env[TOKEN_ENV];
  });

  it("is disabled without configuration and never builds a limiter", async () => {
    await expect(checkRateLimit("signIn", "1.2.3.4")).resolves.toBe(true);
    expect(ratelimitCtor).not.toHaveBeenCalled();
  });

  it("allows when the store allows", async () => {
    process.env[URL_ENV] = "https://example.upstash.io";
    process.env[TOKEN_ENV] = "token";
    limitMock.mockResolvedValue({ success: true });
    await expect(checkRateLimit("signIn", "1.2.3.4")).resolves.toBe(true);
    expect(limitMock).toHaveBeenCalledWith("1.2.3.4");
  });

  it("blocks when the store says blocked", async () => {
    process.env[URL_ENV] = "https://example.upstash.io";
    process.env[TOKEN_ENV] = "token";
    limitMock.mockResolvedValue({ success: false });
    await expect(checkRateLimit("signIn", "1.2.3.4")).resolves.toBe(false);
  });

  it("fails open when the store check throws", async () => {
    process.env[URL_ENV] = "https://example.upstash.io";
    process.env[TOKEN_ENV] = "token";
    limitMock.mockRejectedValue(new Error("redis down"));
    await expect(checkRateLimit("signIn", "1.2.3.4")).resolves.toBe(true);
  });
});
