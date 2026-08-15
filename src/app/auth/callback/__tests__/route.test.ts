import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  exchangeMock,
  signOutMock,
  deleteUserMock,
  countMock,
  eqMock,
  storeMock,
  markApprovedMock,
  notifyAdminsOfSignupMock,
} = vi.hoisted(() => ({
  exchangeMock: vi.fn(),
  signOutMock: vi.fn(),
  deleteUserMock: vi.fn(),
  countMock: vi.fn(),
  eqMock: vi.fn(),
  storeMock: vi.fn(),
  markApprovedMock: vi.fn(),
  notifyAdminsOfSignupMock: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: () => storeMock() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession: exchangeMock, signOut: signOutMock },
  })),
}));

// The table name is handed to countMock so a test can answer per table rather
// than uniformly. Without that, a test could not show that one table alone is
// enough to block the delete, which is the whole point of counting five.
//
// eq records the column and value it was filtered on. A wrong column errors
// against real Postgrest and is caught by the error branch, but a wrong value
// returns honest zeros and would authorise the delete, so the filter is the
// one mechanism making the guard correct and it has to be asserted.
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    auth: { admin: { deleteUser: deleteUserMock } },
    from: vi.fn((table: string) => ({
      select: vi.fn(() => ({
        eq: vi.fn((column: string, value: string) => {
          eqMock(column, value);
          return countMock(table);
        }),
      })),
    })),
  })),
}));

vi.mock("@/lib/accounts/approve", () => ({
  markApproved: markApprovedMock,
}));

vi.mock("@/lib/accounts/notify", () => ({
  notifyAdminsOfSignup: notifyAdminsOfSignupMock,
}));

import { GET } from "@/app/auth/callback/route";

const REQ = (url = "https://onyx.test/auth/callback?code=abc") =>
  new Request(url) as never;

const SESSION = (email: string) => ({
  data: { user: { id: "u1", email } },
  error: null,
});

// The account owns one row in the named table and a real zero everywhere else,
// so each test below turns on exactly one table being counted.
const ownsOnly = (owned: string) =>
  countMock.mockImplementation(async (table: string) => ({
    count: table === owned ? 1 : 0,
    error: null,
  }));

// Any project ref will do, so long as the route derives the cookie name from
// this URL rather than from a constant of its own.
const AUTH_COOKIE = "sb-abcdefgh-auth-token";

beforeEach(() => {
  vi.stubEnv("ALLOWED_EMAILS", "yes@b.com");
  // Restubbed to closed every test, since vi.stubEnv otherwise leaks a value
  // set by one test into the next and the reject path invariants below depend
  // on this being unset by default.
  vi.stubEnv("OPEN_SIGNUP", "");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://abcdefgh.supabase.co");
  exchangeMock.mockReset().mockResolvedValue(SESSION("yes@b.com"));
  signOutMock.mockReset().mockResolvedValue({ error: null });
  deleteUserMock.mockReset().mockResolvedValue({});
  countMock.mockReset().mockResolvedValue({ count: 0, error: null });
  eqMock.mockReset();
  storeMock.mockReset().mockReturnValue([]);
  markApprovedMock.mockReset().mockResolvedValue(undefined);
  notifyAdminsOfSignupMock.mockReset().mockResolvedValue(undefined);
});

describe("the oauth callback", () => {
  it("admits an allowlisted email", async () => {
    const res = await GET(REQ());
    expect(res.headers.get("location")).toBe("https://onyx.test/");
    expect(signOutMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  // The allowlist is the auto approve list now, so admitting a listed email
  // marks the account approved as part of the same trip through the route.
  it("approves an allowlisted email as it admits it", async () => {
    await GET(REQ());
    expect(markApprovedMock).toHaveBeenCalledWith("u1");
  });

  // An allowlisted signup approves itself and stays silent.
  it("sends no admin notification for an allowlisted email", async () => {
    await GET(REQ());
    expect(notifyAdminsOfSignupMock).not.toHaveBeenCalled();
  });

  it("admits an uninvited provider sign in when signup is open", async () => {
    vi.stubEnv("OPEN_SIGNUP", "true");
    exchangeMock.mockResolvedValue(SESSION("stranger@c.com"));
    const response = await GET(REQ());
    expect(response.headers.get("location")).toBe("https://onyx.test/");
    expect(signOutMock).not.toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(markApprovedMock).not.toHaveBeenCalled();
  });

  // Only an account that lands unapproved needs the admin to do anything.
  it("notifies admins when an uninvited provider sign in is admitted through open signup", async () => {
    vi.stubEnv("OPEN_SIGNUP", "true");
    exchangeMock.mockResolvedValue(SESSION("stranger@c.com"));
    await GET(REQ());
    expect(notifyAdminsOfSignupMock).toHaveBeenCalledWith("stranger@c.com");
  });

  // The invariant that must survive this branch untouched.
  it("still refuses and still never deletes an account with data when closed", async () => {
    countMock.mockResolvedValue({ count: 3, error: null });
    exchangeMock.mockResolvedValue(SESSION("stranger@c.com"));
    const response = await GET(REQ());
    expect(response.headers.get("location")).toContain("not-invited");
    expect(signOutMock).toHaveBeenCalled();
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  it("rejects an email that is not on the list", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    const res = await GET(REQ());
    expect(res.headers.get("location")).toContain("/sign-in");
    expect(signOutMock).toHaveBeenCalled();
  });

  // The marker, not just the path. Without this a bare /sign-in redirect would
  // satisfy every other reject assertion here while silently killing the
  // notice the sign in page renders from it.
  it("sends the rejected visitor back with the marker that shows the notice", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    const res = await GET(REQ());
    expect(res.headers.get("location")).toContain("error=not-invited");
  });

  it("deletes a rejected account that owns nothing", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    await GET(REQ());
    expect(deleteUserMock).toHaveBeenCalledWith("u1");
    // The filter is what makes the count mean anything. A wrong value here
    // reads somebody else's empty result and authorises this delete.
    expect(eqMock).toHaveBeenCalledWith("user_id", "u1");
    expect(eqMock).toHaveBeenCalledTimes(5);
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

  // The test above sets both an error and a null count, so either half of the
  // guard alone would satisfy it. This one reports no error at all and still
  // withholds the number, which is the defence in depth half on its own.
  it("NEVER deletes a rejected account counted without error but without a number", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    countMock.mockResolvedValue({ count: null, error: null });
    const res = await GET(REQ());
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  // A refused visitor keeps a live session if the sign out failed and nothing
  // else clears it, and for an account that owns data no delete follows to
  // invalidate it either. The refusal has to be carried out on the response.
  it("expires the auth cookies when the sign out fails", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    signOutMock.mockResolvedValue({ error: new Error("auth server unreachable") });
    storeMock.mockReturnValue([
      { name: `${AUTH_COOKIE}.0`, value: "first" },
      { name: `${AUTH_COOKIE}.1`, value: "second" },
      { name: "unrelated", value: "keep me" },
    ]);
    const res = await GET(REQ());
    expect(res.cookies.get(AUTH_COOKIE)?.maxAge).toBe(0);
    expect(res.cookies.get(`${AUTH_COOKIE}.0`)?.maxAge).toBe(0);
    expect(res.cookies.get(`${AUTH_COOKIE}.1`)?.maxAge).toBe(0);
    expect(res.cookies.get(`${AUTH_COOKIE}.0`)?.value).toBe("");
  });

  // The cookie belongs to whichever project is configured, so the name is
  // derived from the URL. A route carrying its own constant would fail here.
  it("expires the auth cookies of the configured project", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://zzzotherref.supabase.co");
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    signOutMock.mockResolvedValue({ error: new Error("auth server unreachable") });
    const res = await GET(REQ());
    expect(res.cookies.get("sb-zzzotherref-auth-token")?.maxAge).toBe(0);
    expect(res.cookies.get(AUTH_COOKIE)).toBeUndefined();
  });

  // The counterpart. A sign out that worked already cleared the session, so
  // the response must not be carrying cookie surgery on the happy path.
  it("leaves the cookies alone when the sign out succeeded", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    storeMock.mockReturnValue([{ name: `${AUTH_COOKIE}.0`, value: "first" }]);
    const res = await GET(REQ());
    expect(res.cookies.get(AUTH_COOKIE)).toBeUndefined();
    expect(res.cookies.get(`${AUTH_COOKIE}.0`)).toBeUndefined();
  });

  // Cookies that are not the project's auth token are none of this route's
  // business, and expiring them would sign the visitor out of other things.
  it("expires nothing that is not the project auth cookie", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    signOutMock.mockResolvedValue({ error: new Error("auth server unreachable") });
    storeMock.mockReturnValue([
      { name: "unrelated", value: "keep me" },
      { name: "sb-otherproject-auth-token", value: "not ours" },
    ]);
    const res = await GET(REQ());
    expect(res.cookies.get("unrelated")).toBeUndefined();
    expect(res.cookies.get("sb-otherproject-auth-token")).toBeUndefined();
  });

  // A goal on its own is enough, with no routine, no session and no custom
  // exercise behind it. It is something a person sat down and typed in, and
  // deleting the account takes it with them.
  it("NEVER deletes a rejected account whose only data is a goal", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    ownsOnly("goals");
    const res = await GET(REQ());
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  // Cheaper to lose than a goal, and counted anyway. A safety interlock has to
  // fail towards refusing to delete, and counting this costs the intended path
  // nothing, because the account this route removes owns nothing at all.
  it("NEVER deletes a rejected account whose only data is a push subscription", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    ownsOnly("push_subscriptions");
    const res = await GET(REQ());
    expect(deleteUserMock).not.toHaveBeenCalled();
    expect(signOutMock).toHaveBeenCalled();
    expect(res.headers.get("location")).toContain("/sign-in");
  });

  // The counterpart, and the reason user_settings is left out of the count.
  // The handle_new_user trigger gives every account a settings row at signup,
  // so counting it would make every account look occupied and this delete
  // would never fire at all. An account holding nothing but that row is
  // exactly what the route is built to remove.
  it("still deletes a rejected account whose only row is its automatic settings", async () => {
    exchangeMock.mockResolvedValue(SESSION("no@b.com"));
    ownsOnly("user_settings");
    await GET(REQ());
    expect(deleteUserMock).toHaveBeenCalledWith("u1");
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
