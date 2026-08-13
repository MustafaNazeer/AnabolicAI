import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// The names the integration provisioned, recorded when the resource was
// created. The SDK's bare default names are not relied on, per the QStash
// precedent.
const URL_ENV = "KV_REST_API_URL";
const TOKEN_ENV = "KV_REST_API_TOKEN";

export type LimitSurface =
  | "signIn"
  | "signUp"
  | "demo"
  | "restComplete"
  | "quickEntry"
  | "plateau"
  | "insights";

// Sign in is the brute force target. The demo button is the recruiter path
// and stays lenient. The rest callback limit is defense in depth in front
// of the signature check, far above the scheduler's real call volume.
const RULES = {
  signIn: { limit: 10, window: "10 m" },
  signUp: { limit: 5, window: "1 h" },
  demo: { limit: 30, window: "1 h" },
  restComplete: { limit: 60, window: "1 m" },
  // Quick entry parses are user initiated and paid per call, so this bounds
  // one account's spend. Keyed by user id: the caller is always signed in.
  quickEntry: { limit: 30, window: "10 m" },
  // Plateau suggestions call a pricier model, are rarer by nature (one lift
  // stalling is an event, not a habit), and each tap is user initiated.
  plateau: { limit: 10, window: "10 m" },
  // Insights are user initiated, one model call per tap, dashboard wide
  // rather than per lift, so the plateau budget fits.
  insights: { limit: 10, window: "10 m" },
} as const;

// The rest callback answers with a status code and no copy, so it has no
// message and asking for one is a compile error rather than a silent default.
export type MessagedSurface = Exclude<LimitSurface, "restComplete">;

// The copy lives beside the windows above so the two cannot drift. "A few
// minutes" is true of sign in and false of the two hour long windows, and the
// demo line is phrased for a recruiter who hit a shared limit rather than for
// someone being turned away.
const MESSAGES: Record<MessagedSurface, string> = {
  signIn: "Too many attempts. Try again in a few minutes.",
  signUp: "Too many sign up attempts. Try again in an hour.",
  demo: "The demo is busy right now. Try again in an hour.",
  quickEntry: "Quick entry is catching its breath. Try again in a few minutes.",
  plateau: "Suggestions are catching their breath. Try again in a few minutes.",
  insights: "Insights are catching their breath. Try again in a few minutes.",
};

export function limitMessage(surface: MessagedSurface): string {
  return MESSAGES[surface];
}

// Vercel overwrites x-forwarded-for with the client's public IP and does not
// forward external values, so the first entry is not spoofable here.
export function clientIpFrom(forwardedFor: string | null): string {
  const first = forwardedFor?.split(",")[0]?.trim();
  return first ? first : "unknown";
}

let redis: Redis | null | undefined;
let limiters: Partial<Record<LimitSurface, Ratelimit>> = {};

function redisFromEnv(): Redis | null {
  if (redis !== undefined) return redis;
  const url = process.env[URL_ENV];
  const token = process.env[TOKEN_ENV];
  // Absent on localhost by design: limiting is simply off there, the same
  // way QStash scheduling is.
  redis = url && token ? new Redis({ url, token }) : null;
  return redis;
}

function limiterFor(surface: LimitSurface): Ratelimit | null {
  const store = redisFromEnv();
  if (!store) return null;
  limiters[surface] ??= new Ratelimit({
    redis: store,
    limiter: Ratelimit.slidingWindow(RULES[surface].limit, RULES[surface].window),
    prefix: `onyx:${surface}`,
  });
  return limiters[surface];
}

// True means allowed. Every path that is not a positive "blocked" answer
// from the store allows: no configuration disables limiting, and a store
// error logs and allows, because availability beats strictness here. Only
// the surface is logged, never an address or an identity.
export async function checkRateLimit(
  surface: LimitSurface,
  ip: string,
): Promise<boolean> {
  const limiter = limiterFor(surface);
  if (!limiter) return true;
  try {
    const { success } = await limiter.limit(ip);
    if (!success) {
      console.log("rate-limit: blocked", JSON.stringify({ surface }));
    }
    return success;
  } catch (error) {
    // The cause is kept because a rotated or revoked token disables limiting
    // everywhere and, without it, looks identical in the logs to a transient
    // blip. The MESSAGE only: not the error object, not its stack, not a
    // spread of its properties, any of which a client library could fill with
    // more than intended. An Upstash message can carry the REST URL, which is
    // accepted; it cannot carry the token, and the address is never logged.
    const cause = error instanceof Error ? error.message : "unknown";
    console.log("rate-limit: check failed", JSON.stringify({ surface, cause }));
    return true;
  }
}

// Test seam: clears the memoised clients so env changes take effect.
export function resetRateLimiting(): void {
  redis = undefined;
  limiters = {};
}
