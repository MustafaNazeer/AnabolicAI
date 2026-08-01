import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDemoSeed } from "@/lib/demo/seed";
import { planDemoWrite, type DemoWrite } from "@/lib/demo/plan";

/**
 * The narrow slice of the database this module needs.
 *
 * Declared as its own interface rather than taking a Supabase client, so the
 * logic can be tested against a plain object and the adapter below stays the
 * only place that knows about Supabase.
 */
export type DemoDb = {
  findUserIdByEmail(email: string): Promise<string | null>;
  listDefaultExercises(): Promise<{ id: string; name: string }[]>;
  deleteOwnedBy(table: string, userId: string): Promise<void>;
  insertRows(table: string, rows: unknown[]): Promise<void>;
  disableNotifications(userId: string): Promise<void>;
};

export type DemoResetResult = { ok: boolean; reason?: string };

// Order matters. routines first because routine_exercises, workout_sessions,
// workout_sets and session_exercise_swaps all cascade from it. The other three
// hang off the user directly and cascade from nothing.
const DELETE_TABLES = ["routines", "goals", "exercises", "push_subscriptions"] as const;

// Foreign key order.
const INSERT_ORDER: (keyof DemoWrite)[] = [
  "routines",
  "routine_exercises",
  "workout_sessions",
  "workout_sets",
  "goals",
];

export async function resetDemoAccount(
  db: DemoDb,
  email: string,
  now: Date,
): Promise<DemoResetResult> {
  const userId = await db.findUserIdByEmail(email);
  // Not an error. The demo account is optional, and an environment without one
  // configured should carry on rather than fail the whole cron run.
  if (!userId) return { ok: false, reason: "no demo user" };

  const seed = buildDemoSeed(now);
  const library = await db.listDefaultExercises();
  const ids = new Map(library.map((e) => [e.name, e.id]));
  // Planned before anything is deleted, so a seed that references a missing
  // exercise throws while the account is still intact.
  const write = planDemoWrite(seed, ids, userId, () => crypto.randomUUID());

  for (const table of DELETE_TABLES) await db.deleteOwnedBy(table, userId);
  for (const table of INSERT_ORDER) await db.insertRows(table, write[table]);
  await db.disableNotifications(userId);

  return { ok: true };
}

/** Bind the interface above to a real admin client. */
export function supabaseDemoDb(admin: SupabaseClient): DemoDb {
  return {
    async findUserIdByEmail(email) {
      const { data } = await admin.auth.admin.listUsers();
      const found = data?.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      return found?.id ?? null;
    },
    async listDefaultExercises() {
      const { data } = await admin
        .from("exercises")
        .select("id, name")
        .eq("is_default", true);
      return (data ?? []) as { id: string; name: string }[];
    },
    async deleteOwnedBy(table, userId) {
      await admin.from(table).delete().eq("user_id", userId);
    },
    async insertRows(table, rows) {
      if (rows.length === 0) return;
      await admin.from(table).insert(rows);
    },
    async disableNotifications(userId) {
      await admin
        .from("user_settings")
        .update({ notif_master: false })
        .eq("user_id", userId);
    },
  };
}
