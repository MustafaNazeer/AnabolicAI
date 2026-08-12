import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getUserMock,
  maybeSingleMock,
  upsertMock,
  checkRateLimitMock,
  getPlateauDataMock,
  suggestWithModelMock,
  anthropicCtor,
} = vi.hoisted(() => ({
  getUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  upsertMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getPlateauDataMock: vi.fn(),
  suggestWithModelMock: vi.fn(),
  anthropicCtor: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({ maybeSingle: maybeSingleMock })),
      })),
      upsert: upsertMock,
    })),
  })),
}));

vi.mock("@/lib/security/rateLimit", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/ai/plateau/queries", () => ({
  getPlateauData: getPlateauDataMock,
}));

vi.mock("@/lib/ai/plateau/suggest", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  suggestWithModel: suggestWithModelMock,
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: anthropicCtor.mockImplementation(function () {
    return {};
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { suggestForPlateau, setAiPlateau } from "@/lib/ai/plateau/actions";

const EXERCISE_ID = "11111111-2222-4333-8444-555555555555";
const SUGGESTION = { kind: "deload", text: "Drop to 175 and build back up." };

// Reps of 1 make the per session e1rm equal the weight, so these vectors are
// the same ones the detection tests pinned.
function sessionsOf(values: number[]) {
  const now = Date.now();
  return values.map((weight, i) => ({
    completedAt: new Date(
      now - (values.length - 1 - i) * 4 * 86_400_000,
    ).toISOString(),
    sets: [{ reps: 1, weight, rir_low: null, rir_high: null }],
  }));
}

function stalledData() {
  return {
    exerciseName: "Bench Press",
    muscleGroup: "chest",
    restSeconds: 120,
    sessions: sessionsOf([185, 185, 185, 185]),
  };
}

function signedIn() {
  getUserMock.mockResolvedValue({ data: { user: { id: "user-123" } } });
}

function consent(on: boolean) {
  maybeSingleMock.mockResolvedValue({ data: { ai_plateau: on } });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
  checkRateLimitMock.mockResolvedValue(true);
  getPlateauDataMock.mockResolvedValue(stalledData());
  suggestWithModelMock.mockResolvedValue(SUGGESTION);
});

describe("suggestForPlateau", () => {
  it("returns the suggestion when every gate passes", async () => {
    signedIn();
    consent(true);
    await expect(suggestForPlateau(EXERCISE_ID)).resolves.toEqual({
      ok: true,
      suggestion: SUGGESTION,
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith("plateau", "user-123");
  });

  it("fails closed when signed out and never queries or calls the model", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    const result = await suggestForPlateau(EXERCISE_ID);
    expect(result.ok).toBe(false);
    expect(getPlateauDataMock).not.toHaveBeenCalled();
    expect(suggestWithModelMock).not.toHaveBeenCalled();
  });

  it("refuses without consent and never queries or calls the model", async () => {
    signedIn();
    consent(false);
    await expect(suggestForPlateau(EXERCISE_ID)).resolves.toEqual({
      ok: false,
      error: "Turn on plateau suggestions in Settings first.",
    });
    expect(getPlateauDataMock).not.toHaveBeenCalled();
    expect(suggestWithModelMock).not.toHaveBeenCalled();
  });

  it("rejects a malformed exercise id before rate limiting", async () => {
    signedIn();
    consent(true);
    const result = await suggestForPlateau("not-a-uuid");
    expect(result.ok).toBe(false);
    expect(checkRateLimitMock).not.toHaveBeenCalled();
    expect(suggestWithModelMock).not.toHaveBeenCalled();
  });

  it("stops at the rate limit", async () => {
    signedIn();
    consent(true);
    checkRateLimitMock.mockResolvedValue(false);
    const result = await suggestForPlateau(EXERCISE_ID);
    expect(result.ok).toBe(false);
    expect(suggestWithModelMock).not.toHaveBeenCalled();
  });

  it("refuses when the database says the lift is not stalled", async () => {
    signedIn();
    consent(true);
    getPlateauDataMock.mockResolvedValue({
      ...stalledData(),
      sessions: sessionsOf([135, 140, 140, 145]),
    });
    await expect(suggestForPlateau(EXERCISE_ID)).resolves.toEqual({
      ok: false,
      error: "This lift does not look stalled right now.",
    });
    expect(suggestWithModelMock).not.toHaveBeenCalled();
  });

  it("refuses when the exercise has no data", async () => {
    signedIn();
    consent(true);
    getPlateauDataMock.mockResolvedValue(null);
    const result = await suggestForPlateau(EXERCISE_ID);
    expect(result.ok).toBe(false);
    expect(suggestWithModelMock).not.toHaveBeenCalled();
  });

  it("degrades gracefully with no API key", async () => {
    signedIn();
    consent(true);
    delete process.env.ANTHROPIC_API_KEY;
    await expect(suggestForPlateau(EXERCISE_ID)).resolves.toEqual({
      ok: false,
      error: "Suggestions are unavailable right now.",
    });
  });

  it("maps a thrown model error to friendly copy", async () => {
    signedIn();
    consent(true);
    suggestWithModelMock.mockRejectedValue(new Error("529 overloaded"));
    await expect(suggestForPlateau(EXERCISE_ID)).resolves.toEqual({
      ok: false,
      error: "Suggestions are unavailable right now.",
    });
  });

  it("maps unusable model output to friendly copy", async () => {
    signedIn();
    consent(true);
    suggestWithModelMock.mockResolvedValue(null);
    await expect(suggestForPlateau(EXERCISE_ID)).resolves.toEqual({
      ok: false,
      error: "Could not come up with a suggestion. Try again in a moment.",
    });
  });
});

describe("setAiPlateau", () => {
  it("upserts the consent row", async () => {
    signedIn();
    upsertMock.mockResolvedValue({ error: null });
    await expect(setAiPlateau(true)).resolves.toEqual({ ok: true });
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "user-123", ai_plateau: true },
      { onConflict: "user_id" },
    );
  });

  it("fails closed when signed out", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    await expect(setAiPlateau(true)).resolves.toEqual({
      error: "Not signed in.",
    });
  });
});
