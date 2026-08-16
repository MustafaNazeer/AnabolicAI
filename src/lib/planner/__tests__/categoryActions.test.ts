import { describe, it, expect, vi, beforeEach } from "vitest";

const { getVerifiedUserMock, insertMock, fromMock } = vi.hoisted(() => {
  const insertMock = vi.fn(async () => ({ error: null }));
  return {
    getVerifiedUserMock: vi.fn(),
    insertMock,
    fromMock: vi.fn(() => ({ insert: insertMock })),
  };
});

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ from: fromMock })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { addPlannerCategory } from "@/lib/planner/categoryActions";

beforeEach(() => {
  vi.clearAllMocks();
  getVerifiedUserMock.mockResolvedValue({ id: "u1", email: "her@example.com" });
});

describe("addPlannerCategory", () => {
  it("refuses when signed out", async () => {
    getVerifiedUserMock.mockResolvedValue(null);
    await expect(addPlannerCategory("Yoga")).resolves.toEqual({ error: "Not signed in." });
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("refuses an empty name rather than writing a blank chip", async () => {
    await expect(addPlannerCategory("   ")).resolves.toEqual({
      error: "Give the category a name.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });

  // The check constraint refuses is_default true with an owner, so getting this
  // wrong is a database error rather than a silently wrong row. Asserting it
  // here means the failure shows up in the suite instead of on her screen.
  it("writes a custom row owned by her, never a seeded one", async () => {
    await addPlannerCategory("Yoga");
    expect(insertMock).toHaveBeenCalledWith({
      user_id: "u1",
      name: "Yoga",
      is_default: false,
    });
  });

  it("trims the name before writing it", async () => {
    await addPlannerCategory("  Hiking  ");
    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Hiking" }),
    );
  });

  // planner_categories_name_length caps a name at 60 characters, so anything
  // longer is a database error the interface would show her raw. Refusing it
  // here keeps the message hers rather than Postgres's.
  it("refuses a name the column could not hold", async () => {
    await expect(addPlannerCategory("y".repeat(61))).resolves.toEqual({
      error: "That name is too long.",
    });
    expect(fromMock).not.toHaveBeenCalled();
  });
});
