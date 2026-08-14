import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  getVerifiedUserMock,
  maybeSingleMock,
  upsertMock,
  checkRateLimitMock,
  getInsightsDataMock,
  getDashboardDataMock,
  insightsWithModelMock,
  anthropicCtor,
} = vi.hoisted(() => ({
  getVerifiedUserMock: vi.fn(),
  maybeSingleMock: vi.fn(),
  upsertMock: vi.fn(),
  checkRateLimitMock: vi.fn(),
  getInsightsDataMock: vi.fn(),
  getDashboardDataMock: vi.fn(),
  insightsWithModelMock: vi.fn(),
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

vi.mock("@/lib/ai/insights/queries", () => ({
  getInsightsData: getInsightsDataMock,
}));

vi.mock("@/lib/progress/queries", () => ({
  getDashboardData: getDashboardDataMock,
}));

vi.mock("@/lib/ai/insights/suggest", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  insightsWithModel: insightsWithModelMock,
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: anthropicCtor.mockImplementation(function () {
    return {};
  }),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { suggestInsights, setAiInsights } from "@/lib/ai/insights/actions";

const INSIGHTS = { insights: ["Your bench is holding steady."] };

// Reps of 1 make the per session e1rm equal the weight, so these vectors are
// the same ones the detection tests pinned. Sessions land 4 days apart with
// the last one today, inside the detector's recency window.
function sessionsOf(exerciseId: string, values: number[]) {
  const now = Date.now();
  return values.map((weight, i) => ({
    completedAt: new Date(
      now - (values.length - 1 - i) * 4 * 86_400_000,
    ).toISOString(),
    sets: [{ exerciseId, reps: 1, weight, rir_low: null, rir_high: null }],
  }));
}

const EX_BENCH = "11111111-2222-4333-8444-555555555555";

function namesOf(entries: [string, string][]) {
  return new Map(
    entries.map(([id, name]) => [id, { name, muscleGroup: "chest" }]),
  );
}

// An improving series: confidently up, so anyStalled stays false.
function improvingData() {
  return {
    sessions: sessionsOf(EX_BENCH, [135, 140, 140, 145]),
    exercises: namesOf([[EX_BENCH, "Bench Press"]]),
  };
}

// A flat series: the detector calls this stalled.
function stalledData() {
  return {
    sessions: sessionsOf(EX_BENCH, [185, 185, 185, 185]),
    exercises: namesOf([[EX_BENCH, "Bench Press"]]),
  };
}

function signedIn() {
  getVerifiedUserMock.mockResolvedValue({ id: "user-123", email: "a@b.com" });
}

function consent(on: boolean) {
  maybeSingleMock.mockResolvedValue({ data: { ai_insights: on } });
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.ANTHROPIC_API_KEY = "test-key";
  checkRateLimitMock.mockResolvedValue(true);
  getInsightsDataMock.mockResolvedValue(improvingData());
  getDashboardDataMock.mockResolvedValue({
    weekly: { workouts: 3, sets: 42, volume: 12000 },
    streakWeeks: 5,
    recent: [],
    prs: [],
  });
  insightsWithModelMock.mockResolvedValue(INSIGHTS);
});

describe("suggestInsights", () => {
  it("returns insights when every gate passes, with anyStalled false for an improving lift", async () => {
    signedIn();
    consent(true);
    await expect(suggestInsights()).resolves.toEqual({
      ok: true,
      insights: INSIGHTS.insights,
      anyStalled: false,
    });
    expect(checkRateLimitMock).toHaveBeenCalledWith("insights", "user-123");
    expect(anthropicCtor).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 15_000, maxRetries: 1 }),
    );
  });

  it("builds the message from the named fields and nothing else identifying", async () => {
    signedIn();
    consent(true);
    await suggestInsights();
    const message = insightsWithModelMock.mock.calls[0][1];
    expect(message).toContain("Bench Press");
    expect(message).toContain("chest");
    expect(message).toContain("This week: 3 workouts, 42 sets. Streak: 5 weeks.");
    expect(message).toContain("Trend by estimated 1RM:");
    expect(message).toContain("Stall check:");
    expect(message).not.toContain(EX_BENCH);
    expect(message).not.toContain("user-123");
  });

  it("reports anyStalled for a flat lift", async () => {
    signedIn();
    consent(true);
    getInsightsDataMock.mockResolvedValue(stalledData());
    const result = await suggestInsights();
    expect(result).toEqual({
      ok: true,
      insights: INSIGHTS.insights,
      anyStalled: true,
    });
  });

  // If the read ever stopped returning oldest first, trusting its order
  // would silently flip the slope's sign and read a declining lift as
  // improving. This feeds the mock the rows newest first on purpose: the
  // dates are the real ones, only the array order is wrong, the way a
  // broken query would deliver it. A declining lift must still come out
  // stalled or declining, which only happens if the action re-sorts.
  it("sorts sessions by completed date rather than trusting the query's row order", async () => {
    signedIn();
    consent(true);
    getInsightsDataMock.mockResolvedValue({
      sessions: sessionsOf(EX_BENCH, [225, 220, 215, 210]).reverse(),
      exercises: namesOf([[EX_BENCH, "Bench Press"]]),
    });
    const result = await suggestInsights();
    expect(result).toEqual({
      ok: true,
      insights: INSIGHTS.insights,
      anyStalled: true,
    });
  });

  // Ties on the latest session date are the COMMON case, not an edge one,
  // because a single workout trains several lifts at once. Without a total
  // order the cap keeps whichever five the grouping walk happened to insert
  // first, which is a rule nobody chose and which a Node upgrade could
  // change. History breaks the tie first: four sessions give the model a
  // real trend, one session only ever renders "Not enough sessions yet".
  it("ranks a tie on the latest session date by how much history each lift has", async () => {
    signedIn();
    consent(true);
    const now = Date.now();
    const at = (daysAgo: number) =>
      new Date(now - daysAgo * 86_400_000).toISOString();
    const set = (id: string) => ({
      exerciseId: id,
      reps: 1,
      weight: 100,
      rir_low: null,
      rir_high: null,
    });
    // Lift Z has four sessions to Lift A's one, and both were last trained
    // today. Its id also sorts AFTER Lift A's, so this passes on the history
    // key alone: an id-only tie break would put Lift A first and fail here.
    getInsightsDataMock.mockResolvedValue({
      sessions: [
        { completedAt: at(12), sets: [set("ex-z")] },
        { completedAt: at(8), sets: [set("ex-z")] },
        { completedAt: at(4), sets: [set("ex-z")] },
        { completedAt: at(0), sets: [set("ex-z"), set("ex-a")] },
      ],
      exercises: namesOf([
        ["ex-a", "Lift A"],
        ["ex-z", "Lift Z"],
      ]),
    });
    await suggestInsights();
    const message = insightsWithModelMock.mock.calls[0][1];
    expect(message.indexOf("Lift Z")).toBeLessThan(message.indexOf("Lift A"));
  });

  // Two lifts trained once, in the same session, tie on date and on history
  // alike, so something still has to separate them or the order is undefined.
  it("breaks a tie on date and history by exercise id rather than by arrival order", async () => {
    signedIn();
    consent(true);
    const set = (id: string) => ({
      exerciseId: id,
      reps: 1,
      weight: 100,
      rir_low: null,
      rir_high: null,
    });
    // The sets arrive in ascending id order, which the old comparator
    // reversed, so pinning ascending id is a real constraint on it rather
    // than a restatement of whatever the array already did.
    getInsightsDataMock.mockResolvedValue({
      sessions: [
        {
          completedAt: new Date().toISOString(),
          sets: [set("ex-a"), set("ex-z")],
        },
      ],
      exercises: namesOf([
        ["ex-a", "Lift A"],
        ["ex-z", "Lift Z"],
      ]),
    });
    await suggestInsights();
    const message = insightsWithModelMock.mock.calls[0][1];
    expect(message.indexOf("Lift A")).toBeLessThan(message.indexOf("Lift Z"));
  });

  // A dormant account still holds sessions, so it clears the empty guard and
  // would pay for a model call to be told about training it stopped months
  // ago, under a button that asks what stands out THIS WEEK.
  it("refuses without calling the model when nothing has been logged in thirty days", async () => {
    signedIn();
    consent(true);
    const now = Date.now();
    const sessions = [120, 116, 112, 108].map((daysAgo, i) => ({
      completedAt: new Date(now - daysAgo * 86_400_000).toISOString(),
      sets: [
        {
          exerciseId: EX_BENCH,
          reps: 1,
          weight: 135 + i,
          rir_low: null,
          rir_high: null,
        },
      ],
    }));
    getInsightsDataMock.mockResolvedValue({
      sessions,
      exercises: namesOf([[EX_BENCH, "Bench Press"]]),
    });
    await expect(suggestInsights()).resolves.toEqual({
      ok: false,
      error: "No workouts in the last month. Log one and check back.",
    });
    expect(insightsWithModelMock).not.toHaveBeenCalled();
    // The dashboard read is the second query this action makes, and the
    // guard sits above it, so a dormant tap costs exactly one query.
    expect(getDashboardDataMock).not.toHaveBeenCalled();
  });

  it("caps the message at the five most recently trained lifts", async () => {
    signedIn();
    consent(true);
    const ids = ["ex-1", "ex-2", "ex-3", "ex-4", "ex-5", "ex-6"];
    const names: [string, string][] = [
      ["ex-1", "Lift One"],
      ["ex-2", "Lift Two"],
      ["ex-3", "Lift Three"],
      ["ex-4", "Lift Four"],
      ["ex-5", "Lift Five"],
      ["ex-6", "Lift Six"],
    ];
    const now = Date.now();
    // Lift One trained most recently, Lift Six longest ago.
    const sessions = ids.map((id, i) => ({
      completedAt: new Date(now - i * 2 * 86_400_000).toISOString(),
      sets: [{ exerciseId: id, reps: 5, weight: 100, rir_low: null, rir_high: null }],
    }));
    getInsightsDataMock.mockResolvedValue({
      sessions,
      exercises: namesOf(names),
    });
    await suggestInsights();
    const message = insightsWithModelMock.mock.calls[0][1];
    expect(message).toContain("Lift One");
    expect(message).toContain("Lift Five");
    expect(message).not.toContain("Lift Six");
  });

  it("caps each lift at its last four sessions", async () => {
    signedIn();
    consent(true);
    getInsightsDataMock.mockResolvedValue({
      sessions: sessionsOf(EX_BENCH, [100, 110, 120, 130, 140]),
      exercises: namesOf([[EX_BENCH, "Bench Press"]]),
    });
    await suggestInsights();
    const message = insightsWithModelMock.mock.calls[0][1];
    expect(message).toContain("110 x 1");
    expect(message).toContain("140 x 1");
    expect(message).not.toContain("100 x 1");
  });

  // The message is the billed side of the call and a session can carry an
  // unbounded number of sets, so the rendering caps at twelve.
  it("caps the sets rendered per session in the message", async () => {
    signedIn();
    consent(true);
    const filler = (start: number, count: number) =>
      Array.from({ length: count }, (_, i) => ({
        exerciseId: EX_BENCH,
        reps: 1,
        weight: start + i,
        rir_low: null,
        rir_high: null,
      }));
    const base = stalledData();
    const last = base.sessions[base.sessions.length - 1];
    getInsightsDataMock.mockResolvedValue({
      ...base,
      sessions: [
        ...base.sessions.slice(0, 3),
        { ...last, sets: [...filler(101, 12), ...filler(120, 3)] },
      ],
    });
    await suggestInsights();
    const message = insightsWithModelMock.mock.calls[0][1];
    expect(message).toContain("112 x 1");
    expect(message).not.toContain("120 x 1");
  });

  // Two sessions leave zero degrees of freedom, so fitSlope would hand
  // trendDirection a point interval and a bare slope would read as a
  // confident direction. The action must refuse to claim one at all rather
  // than call trendLabel on too few sessions.
  it("refuses to claim a direction when a lift has fewer than four sessions", async () => {
    signedIn();
    consent(true);
    getInsightsDataMock.mockResolvedValue({
      sessions: sessionsOf(EX_BENCH, [135, 140]),
      exercises: namesOf([[EX_BENCH, "Bench Press"]]),
    });
    await suggestInsights();
    const message = insightsWithModelMock.mock.calls[0][1];
    expect(message).toContain("Trend by estimated 1RM: Not enough sessions yet");
    expect(message).not.toContain("Improving");
    expect(message).not.toContain("Holding steady");
    expect(message).not.toContain("Trending down");
  });

  it("drops a session with no sets and refuses when nothing is left", async () => {
    signedIn();
    consent(true);
    getInsightsDataMock.mockResolvedValue({
      sessions: [{ completedAt: new Date().toISOString(), sets: [] }],
      exercises: new Map(),
    });
    await expect(suggestInsights()).resolves.toEqual({
      ok: false,
      error: "Log a few workouts first.",
    });
    expect(insightsWithModelMock).not.toHaveBeenCalled();
  });

  it("fails closed when signed out and never queries or calls the model", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    const result = await suggestInsights();
    expect(result.ok).toBe(false);
    expect(getInsightsDataMock).not.toHaveBeenCalled();
    expect(insightsWithModelMock).not.toHaveBeenCalled();
  });

  it("refuses without consent and never queries or calls the model", async () => {
    signedIn();
    consent(false);
    await expect(suggestInsights()).resolves.toEqual({
      ok: false,
      error: "Turn on weekly insights in Settings first.",
    });
    expect(getInsightsDataMock).not.toHaveBeenCalled();
    expect(insightsWithModelMock).not.toHaveBeenCalled();
  });

  // Both remaining gates sit ABOVE the derivation, so each has two things
  // worth pinning, not one: that no model call happens, and that no work was
  // done to prepare it. Moving getInsightsData above either gate would leave
  // the model assertion green and fail these.
  it("stops at the rate limit, in its own words, and derives nothing", async () => {
    signedIn();
    consent(true);
    checkRateLimitMock.mockResolvedValue(false);
    await expect(suggestInsights()).resolves.toEqual({
      ok: false,
      error: "Insights are catching their breath. Try again in a few minutes.",
    });
    expect(getInsightsDataMock).not.toHaveBeenCalled();
    expect(insightsWithModelMock).not.toHaveBeenCalled();
  });

  it("degrades gracefully with no API key and derives nothing", async () => {
    signedIn();
    consent(true);
    delete process.env.ANTHROPIC_API_KEY;
    await expect(suggestInsights()).resolves.toEqual({
      ok: false,
      error: "Insights are unavailable right now.",
    });
    expect(getInsightsDataMock).not.toHaveBeenCalled();
    expect(insightsWithModelMock).not.toHaveBeenCalled();
  });

  it("maps a thrown model error to friendly copy", async () => {
    signedIn();
    consent(true);
    insightsWithModelMock.mockRejectedValue(new Error("529 overloaded"));
    await expect(suggestInsights()).resolves.toEqual({
      ok: false,
      error: "Insights are unavailable right now.",
    });
  });

  it("maps unusable model output to friendly copy", async () => {
    signedIn();
    consent(true);
    insightsWithModelMock.mockResolvedValue(null);
    await expect(suggestInsights()).resolves.toEqual({
      ok: false,
      error: "Could not come up with insights. Try again in a moment.",
    });
  });
});

describe("setAiInsights", () => {
  it("upserts the consent row", async () => {
    signedIn();
    upsertMock.mockResolvedValue({ error: null });
    await expect(setAiInsights(true)).resolves.toEqual({ ok: true });
    expect(upsertMock).toHaveBeenCalledWith(
      { user_id: "user-123", ai_insights: true },
      { onConflict: "user_id" },
    );
  });

  it("fails closed when signed out", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(setAiInsights(true)).resolves.toEqual({
      error: "Not signed in.",
    });
  });
});
