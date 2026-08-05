import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// The names the integration provisioned, recorded when the resource was
// created. The SDK's bare default names are not relied on, per the QStash
// precedent.
const URL_ENV = "KV_REST_API_URL";
const TOKEN_ENV = "KV_REST_API_TOKEN";

export type LimitSurface = "signIn" | "signUp" | "demo" | "restComplete";

// Sign in is the brute force target. The demo button is the recruiter path
// and stays lenient. The rest callback limit is defense in depth in front
// of the signature check, far above the scheduler's real call volume.
const RULES = {
  signIn: { limit: 10, window: "10 m" },
  signUp: { limit: 5, window: "1 h" },
  demo: { limit: 30, window: "1 h" },
  restComplete: { limit: 60, window: "1 m" },
} as const;

// Vercel appends to x-forwarded-for, so the leftmost entry is the client.
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
  } catch {
    console.log("rate-limit: check failed", JSON.stringify({ surface }));
    return true;
  }
}

// Test seam: clears the memoised clients so env changes take effect.
export function resetRateLimiting(): void {
  redis = undefined;
  limiters = {};
}
