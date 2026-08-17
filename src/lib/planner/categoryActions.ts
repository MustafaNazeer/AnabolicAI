"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getVerifiedUser } from "@/lib/auth/user";

// Mirrors planner_categories_name_length in 0021. Checked here so a name one
// character too long comes back in this app's words rather than as a raw
// constraint violation from Postgres.
const MAX_NAME = 60;

// Her own categories sit beside the seeded ones. is_default is false and the
// row is owned, which is the half of planner_categories_default_no_user that
// applies to anything written from the app: only the migration writes seeded
// rows, and only with a null owner.
export async function addPlannerCategory(
  name: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const trimmed = name.trim();
  if (!trimmed) return { error: "Give the category a name." };
  if (trimmed.length > MAX_NAME) return { error: "That name is too long." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("planner_categories")
    .insert({ user_id: user.id, name: trimmed, is_default: false });
  if (error) return { error: error.message };

  revalidatePath("/");
  return { ok: true };
}

// Takes a category out of this account's picker.
//
// A HIDE, NOT A DELETE, AND THE DIFFERENCE IS THE WHOLE DESIGN. The six seeded
// categories are one global row each, shared by every account, so deleting one
// would take it from everybody, and the delete policy refuses anyway because it
// keys on ownership and a seeded row has no owner. On top of that
// planner_day_categories references a category with ON DELETE RESTRICT, so any
// category a day already uses could not be removed even if it were hers.
//
// So the row stays. Days that already carry the label keep resolving its name,
// which means removing a chip can never rewrite a week that has already
// happened, and the balance for a past week does not move.
//
// NO categoryId OWNERSHIP CHECK IS NEEDED, because the row written is keyed to
// the caller: hiding a category id that is not visible to this account writes a
// row that only ever filters this account's own picker, and affects nobody.
export async function hidePlannerCategory(
  categoryId: string,
): Promise<{ ok: true } | { error: string }> {
  const user = await getVerifiedUser();
  if (!user) return { error: "Not signed in." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("planner_hidden_categories")
    .insert({ user_id: user.id, category_id: categoryId });
  if (error) return { error: error.message };

  revalidatePath("/");
  return { ok: true };
}
