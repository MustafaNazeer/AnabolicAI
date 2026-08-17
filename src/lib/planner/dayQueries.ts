import { createClient } from "@/lib/supabase/server";
import { plannerWeek, type PlannerDay } from "@/lib/planner/week";
import { APP_TIMEZONE } from "@/lib/notifications/schedule";

// RLS scopes both tables to the caller, so no user filter is needed here and
// none is written, matching getApproved and getAiInsights beside it.
//
// Returns only days that actually have a row. The seven day shape is the
// interface's job, built from plannerWeek, because a week with two entries in
// it is two rows and not five nulls.
export async function getPlannerWeek(now: Date): Promise<PlannerDay[]> {
  const supabase = await createClient();
  const week = plannerWeek(now, APP_TIMEZONE);
  const { data } = await supabase
    .from("planner_days")
    .select("day, done, planner_day_categories(category_id)")
    .gte("day", week[0])
    .lte("day", week[6]);

  // The database row shape, snake case and with the embed still nested, before
  // it is mapped onto PlannerDay. Cast the same way getSessionDetail casts its
  // own embeds, because this client carries no generated types.
  const rows = (data ?? []) as unknown as {
    day: string;
    done: boolean;
    planner_day_categories: { category_id: string }[] | null;
  }[];

  return rows.map((row) => ({
    day: row.day,
    done: row.done,
    categories: (row.planner_day_categories ?? []).map((c) => c.category_id),
  }));
}

export type PlannerCategory = { id: string; name: string; hidden: boolean };

// The seeded rows and this account's own arrive together, because
// planner_categories_select unions them in the policy rather than in the query.
// Seeded first, then hers, so the chips she sees keep a stable order and a new
// one appears at the end rather than in the middle of the set she knows.
// EVERY CATEGORY IS RETURNED, INCLUDING HIDDEN ONES, and that is deliberate.
// A hidden category still has to resolve its name, because days logged before
// it was hidden still carry it and must keep reading correctly. The caller
// filters on `hidden` for the picker and uses the whole list for names, which
// is one query feeding two shapes rather than two queries drifting apart.
//
// Both reads go together because they are independent, matching the pair on the
// dashboard page. RLS scopes the hidden table to the caller, so no user filter
// is written here and none is needed.
export async function getPlannerCategories(): Promise<PlannerCategory[]> {
  const supabase = await createClient();
  const [categories, hidden] = await Promise.all([
    supabase
      .from("planner_categories")
      .select("id, name, is_default")
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase.from("planner_hidden_categories").select("category_id"),
  ]);

  const hiddenIds = new Set(
    ((hidden.data ?? []) as unknown as { category_id: string }[]).map(
      (h) => h.category_id,
    ),
  );

  const rows = (categories.data ?? []) as unknown as { id: string; name: string }[];
  return rows.map((c) => ({ id: c.id, name: c.name, hidden: hiddenIds.has(c.id) }));
}
