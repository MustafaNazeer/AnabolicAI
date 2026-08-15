import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getVerifiedUserMock,
  maybeSingleMock,
  upsertMock,
  checkRateLimitMock,
  parseWithModelMock,
  anthropicCtor,
} = vi.hoisted(() => ({
  getVerifiedUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  upsertMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  parseWithModelMock: vi.fn(),
  anthropicCtor: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
      upsert: upsertMock,
    })),
  })),
}));

vi.mock("@/lib/auth/user", () => ({
  getVerifiedUser: getVerifiedUserMock,
}));

vi.mock("@/lib/security/rateLimit", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/ai/parse", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  parseWithModel: parseWithModelMock,
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: anthropicCtor.mockImplementation(function () {
    return {};
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { parseQuickEntry, setAiQuickEntry } from "@/lib/ai/actions";

const GOOD_SETS = [{ reps: 5, weight: 185, rirLow: null, rirHigh: null }];

function signedIn() {
  getVerifiedUserMock.mockResolvedValue({ id: "user-123", email: "a@b.com" });
}

function consent(on: boolean, approved = true) {
  maybeSingleMock.mockResolvedValue({ data: { ai_quick_entry: on, approved } });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
  checkRateLimitMock.mockResolvedValue(true);
  parseWithModelMock.mockResolvedValue(GOOD_SETS);
});

describe("parseQuickEntry", () => {
  it("returns the sets when every gate passes", async () => {
    signedIn();
    consent(true);
    await expect(parseQuickEntry("185 for 5")).resolves.toEqual({
      ok: true,
      sets: GOOD_SETS,
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith("quickEntry", "user-123");
  });

  it("fails closed when signed out and never calls the model", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    const result = await parseQuickEntry("185 for 5");
    expect(result.ok).toBe(false);
    expect(parseWithModelMock).not.toHaveBeenCalled();
  });

  it("fails closed when consent is off", async () => {
    signedIn();
    consent(false);
    const result = await parseQuickEntry("185 for 5");
    expect(result.ok).toBe(false);
    expect(parseWithModelMock).not.toHaveBeenCalled();
  });

  it("refuses an unapproved account and never calls the model", async () => {
    signedIn();
    consent(true, false);
    const result = await parseQuickEntry("185 for 5");
    expect(result).toEqual({
      ok: false,
      error: "This account is waiting to be approved.",
    });
    expect(parseWithModelMock).not.toHaveBeenCalled();
    // The refusal lands before the rate limiter, so a stranger cannot even
    // consume another account's budget by guessing at it.
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("fails closed on empty input before spending a rate limit token", async () => {
    signedIn();
    consent(true);
    const result = await parseQuickEntry("   ");
    expect(result.ok).toBe(false);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
  });

  it("returns the surface copy when rate limited", async () => {
    signedIn();
    consent(true);
    checkRateLimitMock.mockResolvedValue(false);
    const result = await parseQuickEntry("185 for 5");
    expect(result).toEqual({
      ok: false,
      error: "Quick entry is catching its breath. Try again in a few minutes.",
    });
    expect(parseWithModelMock).not.toHaveBeenCalled();
  });

  it("fails closed with friendly copy when the key is missing", async () => {
    signedIn();
    consent(true);
    delete process.env.ANTHROPIC_API_KEY;
    const result = await parseQuickEntry("185 for 5");
    expect(result.ok).toBe(false);
    expect(anthropicCtor).not.toHaveBeenCalled();
  });

  it("fails closed when the model call throws", async () => {
    signedIn();
    consent(true);
    parseWithModelMock.mockRejectedValue(new Error("529 overloaded"));
    const result = await parseQuickEntry("185 for 5");
    expect(result.ok).toBe(false);
  });

  it("fails closed when the model output is unusable", async () => {
    signedIn();
    consent(true);
    parseWithModelMock.mockResolvedValue(null);
    const result = await parseQuickEntry("185 for 5");
    expect(result.ok).toBe(false);
  });

  // The privacy rail: no path may log what was typed.
  it("never logs the typed text on any path", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const secret = "super secret bench text 185";
    signedIn();
    consent(true);
    await parseQuickEntry(secret);
    parseWithModelMock.mockRejectedValue(new Error("boom"));
    await parseQuickEntry(secret);
    checkRateLimitMock.mockResolvedValue(false);
    await parseQuickEntry(secret);
    expect(JSON.stringify(log.mock.calls)).not.toContain(secret);
    log.mockRestore();
  });
});

describe("setAiQuickEntry", () => {
  it("upserts the column for the signed in user", async () => {
    signedIn();
    upsertMock.mockResolvedValue({ error: null });
    await expect(setAiQuickEntry(true)).resolves.toEqual({ ok: true });
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "user-123", ai_quick_entry: true },
      { onConflict: "user_id" },
    );
  });

  it("refuses when signed out", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(setAiQuickEntry(true)).resolves.toEqual({
      error: "Not signed in.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("refuses to enable a paid feature for an unapproved account", async () => {
    signedIn();
    maybeSingleMock.mockResolvedValue({ data: { approved: false } });
    await expect(setAiQuickEntry(true)).resolves.toEqual({
      error: "This account is waiting to be approved.",
    });
    expect(upsertMock).not.toHaveBeenCalled();
  });

  // Withdrawing consent must never be blocked, including for an account whose
  // approval was revoked after it turned the feature on.
  it("still allows an unapproved account to turn a feature off", async () => {
    signedIn();
    maybeSingleMock.mockResolvedValue({ data: { approved: false } });
    upsertMock.mockResolvedValue({ error: null });
    await expect(setAiQuickEntry(false)).resolves.toEqual({ ok: true });
    expect(upsertMock).toHaveBeenCalled();
  });
});
