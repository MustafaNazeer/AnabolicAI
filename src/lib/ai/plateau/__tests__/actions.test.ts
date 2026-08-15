import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getVerifiedUserMock,
  maybeSingleMock,
  upsertMock,
  checkRateLimitMock,
  getPlateauDataMock,
  suggestWithModelMock,
  anthropicCtor,
} = vi.hoisted(() => ({
  getVerifiedUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  upsertMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getPlateauDataMock: vi.fn(),
  suggestWithModelMock: vi.fn(),
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
  getVerifiedUserMock.mockResolvedValue({ id: "user-123", email: "a@b.com" });
}

function consent(on: boolean, approved = true) {
  maybeSingleMock.mockResolvedValue({ data: { ai_plateau: on, approved } });
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
    const message = suggestWithModelMock.mock.calls[0][1];
    expect(message).toContain("Bench Press");
    expect(message).not.toContain(EXERCISE_ID);
    expect(anthropicCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 15_000, maxRetries: 1 }),
    );
  });

  // If the read ever stopped returning oldest first, trusting its order
  // would silently flip the slope's sign and read a declining lift as
  // improving. This feeds the mock the rows newest first on purpose: the
  // dates are the real ones, only the array order is wrong, the way a
  // broken query would deliver it.
  it("sorts sessions by completed date rather than trusting the query's row order", async () => {
    signedIn();
    consent(true);
    getPlateauDataMock.mockResolvedValue({
      ...stalledData(),
      sessions: sessionsOf([225, 220, 215, 210]).reverse(),
    });
    await expect(suggestForPlateau(EXERCISE_ID)).resolves.toEqual({
      ok: true,
      suggestion: SUGGESTION,
    });
  });

  // The message is the billed side of the call and a session can carry an
  // unbounded number of sets. The detector still sees every one of them,
  // since it takes a maximum and dropping any could change the verdict. The
  // heaviest set sits at index 15, past the cap, on purpose: if the cap ever
  // spread to the detector too, it would never see this set, the series
  // would no longer read as stalled, and the call would be refused instead
  // of succeeding.
  it("caps the sets rendered per session in the message but not what the detector sees", async () => {
    signedIn();
    consent(true);
    const filler = (start: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        reps: 1,
        weight: start + i,
        rir_low: null,
        rir_high: null,
      }));
    const withinCap = filler(101, 12); // indices 0-11, weights 101-112
    const manySets = [
      ...withinCap,
      ...filler(120, 3), // indices 12-14, past the cap
      { reps: 1, weight: 185, rir_low: null, rir_high: null }, // index 15, the heaviest, past the cap
      ...filler(123, 4), // indices 16-19, past the cap
    ];
    const base = stalledData();
    getPlateauDataMock.mockResolvedValue({
      ...base,
      sessions: [
        ...base.sessions.slice(0, 3),
        { ...base.sessions[3], sets: manySets },
      ],
    });

    const result = await suggestForPlateau(EXERCISE_ID);

    // The outcome still reflects the heaviest set: this only reads as
    // stalled, and only succeeds, because the detector saw the 185 at
    // index 15 rather than stopping at the cap.
    expect(result).toEqual({ ok: true, suggestion: SUGGESTION });

    // The message still stops at the cap: the twelfth set survives, the
    // thirteenth does not.
    const message = suggestWithModelMock.mock.calls[0][1];
    expect(message).toContain("112 x 1");
    expect(message).not.toContain("120 x 1");
  });

  it("fails closed when signed out and never queries or calls the model", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
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

  it("refuses an unapproved account and never calls the model", async () => {
    signedIn();
    consent(true, false);
    const result = await suggestForPlateau(EXERCISE_ID);
    expect(result.ok).toBe(false);
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
    expect(suggestWithModelMock).not.toHaveBeenCalled();
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
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(setAiPlateau(true)).resolves.toEqual({
      error: "Not signed in.",
    });
  });
});
