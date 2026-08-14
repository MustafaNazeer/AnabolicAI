import { describe, it, expect, vi, beforeEach } from "vitest";

const { exchangeMock, signOutMock, deleteUserMock, countMock } = vi.hoisted(() => ({
  exchangeMock: vi.fn(),
  signOutMock: vi.fn(),
  deleteUserMock: vi.fn(),
  countMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: exchangeMock, signOut: signOutMock },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { deleteUser: deleteUserMock } },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => countMock()) })),
    })),
  })),
}));

import { GET } from "@/app/auth/callback/route";

const REQ = (url = "https://onyx.test/auth/callback?code=abc") =>
  new Request(url) as never;

const SESSION = (email: string) => ({
  data: { user: { id: "u1", email } },
  error: null,
});

beforeEach(() => {
  vi.stubEnv("ALLOWED_EMAILS", "yes@b.com");
  exchangeMock.mockReset().mockResolvedValue(SESSION("yes@b.com"));
  signOutMock.mockReset().mockResolvedValue({});
  deleteUserMock.mockReset().mockResolvedValue({});
  countMock.mockReset().mockResolvedValue({ count: 0, error: null });
});

describe("the oauth callback", () => {
  it("admits an allowlisted email", async () => {
    const res = await GET(REQ());
    expect(res.headers.get("location")).toBe("https://onyx.test/");
    expect(signOutMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("rejects an email that is not on the list", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    const res = await GET(REQ());
    expect(res.headers.get("location")).toContain("/sign-in");
    expect(signOutMock).toHaveBeenCalled();
  });

  it("deletes a rejected account that owns nothing", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    await GET(REQ());
    expect(deleteUserMock).toHaveBeenCalledWith("u1");
  });

  // THE INVARIANT. Removing an existing user's email from ALLOWED_EMAILS and
  // letting them sign in with a provider must never cascade their training
  // history away. Signing them out is the whole of the correct response.
  it("NEVER deletes a rejected account that owns data", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    countMock.mockResolvedValue({ count: 3, error: null });
    const res = await GET(REQ());
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  // THE INVARIANT AGAIN, on the path that is easiest to get wrong. A failed
  // count is not proof of emptiness: Postgrest answers a broken query with
  // count null, and reading that as zero would delete an account whose history
  // merely could not be read. Unknown has to mean owned, or a transient
  // outage becomes permanent data loss.
  it("NEVER deletes a rejected account whose count query failed", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    countMock.mockResolvedValue({ count: null, error: new Error("boom") });
    const res = await GET(REQ());
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  it("redirects to sign in when the exchange fails", async () => {
    exchangeMock.mockResolvedValue({ data: { user: null }, error: new Error("bad") });
    const res = await GET(REQ());
    expect(res.headers.get("location")).toContain("/sign-in");
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("redirects to sign in when there is no code", async () => {
    const res = await GET(REQ("https://onyx.test/auth/callback"));
    expect(res.headers.get("location")).toContain("/sign-in");
    expect(exchangeMock).not.toHaveBeenCalled();
  });
});
