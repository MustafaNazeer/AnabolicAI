import { describe, it, expect, vi, beforeEach } from "vitest";

const { getVerifiedUserMock, createAdminClientMock, fromMock, updateMock, eqMock } =
  vi.hoisted(() => {
    const eqMock = vi.fn(
      async (): Promise<{ error: { message: string } | null }> => ({ error: null }),
    );
    const updateMock = vi.fn(() => ({ eq: eqMock }));
    const fromMock = vi.fn(() => ({ update: updateMock }));
    return {
      getVerifiedUserMock: vi.fn(),
      createAdminClientMock: vi.fn(() => ({ from: fromMock })),
      fromMock,
      updateMock,
      eqMock,
    };
  });

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: createAdminClientMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setWeekPlanner } from "@/lib/planner/actions";

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  eqMock.mockResolvedValue({ error: null });
});

describe("setWeekPlanner", () => {
  // The Settings switch only renders for an admin, and that protects the
  // rendering and nothing else: a server action is a public endpoint anyone can
  // post to. If this check moved to the page, any signed in account could
  // switch itself into the planner with one request.
  it("refuses a caller who is not an admin, and writes nothing", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "u9", email: "stranger@c.com" });

    await expect(setWeekPlanner(true)).resolves.toEqual({ error: "Not allowed." });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  it("refuses when signed out, and writes nothing", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue(null);

    await expect(setWeekPlanner(true)).resolves.toEqual({ error: "Not allowed." });
    expect(createAdminClientMock).not.toHaveBeenCalled();
  });

  // Deliberately no userId parameter. The switch exists so the admin can see
  // what the planner account sees, so it only ever writes the caller's own row.
  // Anyone else's flag is set out of band, which keeps this endpoint unable to
  // change another account at all rather than merely refusing to.
  it("sets the flag on the caller's own row when the caller is an admin", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "admin-1", email: "boss@b.com" });

    await expect(setWeekPlanner(true)).resolves.toEqual({ ok: true });
    expect(fromMock).toHaveBeenCalledWith("user_settings");
    expect(updateMock).toHaveBeenCalledWith({ week_planner: true });
    expect(eqMock).toHaveBeenCalledWith("user_id", "admin-1");
  });

  it("turns the flag off again rather than only on", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "admin-1", email: "boss@b.com" });

    await setWeekPlanner(false);
    expect(updateMock).toHaveBeenCalledWith({ week_planner: false });
  });

  // The column arrives with no grant on purpose, so a write that somehow runs
  // without the service role fails at the database. Reporting success there
  // would leave the switch showing a state the row does not hold.
  it("surfaces a database error instead of reporting success", async () => {
    vi.stubEnv("ADMIN_EMAILS", "boss@b.com");
    getVerifiedUserMock.mockResolvedValue({ id: "admin-1", email: "boss@b.com" });
    eqMock.mockResolvedValue({ error: { message: "permission denied" } });

    await expect(setWeekPlanner(true)).resolves.toEqual({ error: "permission denied" });
  });
});
