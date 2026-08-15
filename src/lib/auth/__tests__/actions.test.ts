import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  signUpMock,
  headersGetMock,
  checkRateLimitMock,
  markApprovedMock,
  notifyAdminsOfSignupMock,
} = vi.hoisted(() => ({
  signUpMock: vi.fn(),
  headersGetMock: vi.fn(() => null),
  checkRateLimitMock: vi.fn(),
  markApprovedMock: vi.fn(),
  notifyAdminsOfSignupMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => ({ get: headersGetMock })),
}));

// signIn and signInAsDemo call redirect(), which throws by design in Next.js.
// The module is mocked so an unrelated call in this file never runs the real
// thing, even though signUp itself never calls it.
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { signUp: signUpMock } })),
}));

vi.mock("@/lib/security/rateLimit", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  checkRateLimit: checkRateLimitMock,
}));

vi.mock("@/lib/accounts/approve", () => ({
  markApproved: markApprovedMock,
}));

vi.mock("@/lib/accounts/notify", () => ({
  notifyAdminsOfSignup: notifyAdminsOfSignupMock,
}));

import { signUp } from "@/lib/auth/actions";

function formDataFor(email: string, password: string): FormData {
  const fd = new FormData();
  fd.set("email", email);
  fd.set("password", password);
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  headersGetMock.mockReturnValue(null);
  checkRateLimitMock.mockResolvedValue(true);
});

describe("signUp", () => {
  it("admits an uninvited email when signup is open, and leaves it unapproved", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "invited@b.com");
    vi.stubEnv("OPEN_SIGNUP", "true");
    signUpMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const result = await signUp(formDataFor("stranger@c.com", "password123"));
    expect(result).toEqual({ ok: true });
    expect(markApprovedMock).not.toHaveBeenCalled();
  });

  it("approves an invited email as it admits it", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "invited@b.com");
    vi.stubEnv("OPEN_SIGNUP", "true");
    signUpMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    await signUp(formDataFor("invited@b.com", "password123"));
    expect(markApprovedMock).toHaveBeenCalledWith("u1");
  });

  // The closed default, which is the state the app ships in.
  it("still refuses an uninvited email when OPEN_SIGNUP is unset", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "invited@b.com");
    vi.stubEnv("OPEN_SIGNUP", "");
    const result = await signUp(formDataFor("stranger@c.com", "password123"));
    expect(result).toEqual({ error: "This email is not on the invite list." });
    expect(signUpMock).not.toHaveBeenCalled();
  });

  // The allowlist keeps approving on its own even with the door shut, since it
  // is the auto approve list regardless of whether OPEN_SIGNUP is set.
  it("approves an invited email even when signup is closed", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "invited@b.com");
    vi.stubEnv("OPEN_SIGNUP", "");
    signUpMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const result = await signUp(formDataFor("invited@b.com", "password123"));
    expect(result).toEqual({ ok: true });
    expect(markApprovedMock).toHaveBeenCalledWith("u1");
  });

  // Only an account that lands unapproved needs the admin to do anything.
  it("notifies admins when an uninvited email lands unapproved", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "invited@b.com");
    vi.stubEnv("OPEN_SIGNUP", "true");
    signUpMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    await signUp(formDataFor("stranger@c.com", "password123"));
    expect(notifyAdminsOfSignupMock).toHaveBeenCalledWith("stranger@c.com");
  });

  // The property Step 7 proves has teeth: an allowlisted signup approves
  // itself and must stay silent.
  it("sends no admin notification when the email is invited", async () => {
    vi.stubEnv("ALLOWED_EMAILS", "invited@b.com");
    vi.stubEnv("OPEN_SIGNUP", "true");
    signUpMock.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    await signUp(formDataFor("invited@b.com", "password123"));
    expect(notifyAdminsOfSignupMock).not.toHaveBeenCalled();
  });
});
