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
