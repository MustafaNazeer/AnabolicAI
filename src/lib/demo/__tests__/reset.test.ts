import { describe, it, expect } from "vitest";
import { resetDemoAccount, type DemoDb } from "@/lib/demo/reset";

const NOW = new Date("2026-08-01T14:00:00.000Z");

type Call = { table: string; op: "delete" | "insert" | "update"; count?: number };

function fakeDb(
  opts: { userId?: string | null; exercises?: { id: string; name: string }[] } = {},
) {
  const calls: Call[] = [];
  const exercises =
    opts.exercises ??
    // Every default exercise the seed can reference.
    [
      "Bench Press",
      "Overhead Press",
      "Incline Bench Press",
      "Tricep Pushdown",
      "Deadlift",
      "Barbell Row",
      "Lat Pulldown",
      "Barbell Curl",
      "Squat",
      "Romanian Deadlift",
      "Leg Press",
      "Leg Curl",
    ].map((name, i) => ({ id: `ex-${i}`, name }));

  const db: DemoDb = {
    async findUserIdByEmail() {
      return opts.userId === undefined ? "demo-user" : opts.userId;
    },
    async listDefaultExercises() {
      return exercises;
    },
    async deleteOwnedBy(table) {
      calls.push({ table, op: "delete" });
    },
    async insertRows(table, rows) {
      calls.push({ table, op: "insert", count: rows.length });
    },
    async disableNotifications() {
      calls.push({ table: "user_settings", op: "update" });
    },
  };
  return { db, calls };
}

describe("resetDemoAccount", () => {
  it("does nothing when the demo user does not exist", async () => {
    const { db, calls } = fakeDb({ userId: null });
    const result = await resetDemoAccount(db, "demo@example.com", NOW);
    expect(result.ok).toBe(false);
    expect(calls).toHaveLength(0);
  });

  it("deletes exactly the four tables that do not cascade from each other", async () => {
    const { db, calls } = fakeDb();
    await resetDemoAccount(db, "demo@example.com", NOW);
    const deleted = calls.filter((c) => c.op === "delete").map((c) => c.table);
    expect(deleted).toEqual(["routines", "goals", "exercises", "push_subscriptions"]);
  });

  it("writes every table after the deletes, in foreign key order", async () => {
    const { db, calls } = fakeDb();
    await resetDemoAccount(db, "demo@example.com", NOW);
    const lastDelete = calls.map((c) => c.op).lastIndexOf("delete");
    const firstInsert = calls.map((c) => c.op).indexOf("insert");
    expect(firstInsert).toBeGreaterThan(lastDelete);
    expect(calls.filter((c) => c.op === "insert").map((c) => c.table)).toEqual([
      "routines",
      "routine_exercises",
      "workout_sessions",
      "workout_sets",
      "goals",
    ]);
  });

  it("seeds three routines and twenty four sessions", async () => {
    const { db, calls } = fakeDb();
    const result = await resetDemoAccount(db, "demo@example.com", NOW);
    const byTable = (t: string) =>
      calls.find((c) => c.op === "insert" && c.table === t)?.count;
    expect(byTable("routines")).toBe(3);
    expect(byTable("workout_sessions")).toBe(24);
    expect(byTable("goals")).toBe(2);
    expect(result.ok).toBe(true);
  });

  it("leaves notifications disabled so the demo never enters the cron's send loop", async () => {
    const { db, calls } = fakeDb();
    await resetDemoAccount(db, "demo@example.com", NOW);
    expect(calls.some((c) => c.table === "user_settings" && c.op === "update")).toBe(true);
  });

  it("fails loudly when the default library is missing an exercise the seed needs", async () => {
    const { db } = fakeDb({ exercises: [{ id: "ex-0", name: "Bench Press" }] });
    await expect(resetDemoAccount(db, "demo@example.com", NOW)).rejects.toThrow(
      /unknown exercise/,
    );
  });
});
