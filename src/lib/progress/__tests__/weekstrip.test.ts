import { describe, it, expect } from "vitest";
import { weekStripDays } from "@/lib/progress/weekstrip";

const TZ = "America/Chicago";

describe("weekStripDays", () => {
  it("marks trained, today, rest, and future across the current week", () => {
    const now = new Date("2026-06-24T18:00:00Z"); // Wednesday
    const days = weekStripDays(
      [{ completedAt: "2026-06-22T15:00:00Z" }], // Monday trained
      now,
      TZ,
    );
    expect(days).toHaveLength(7);
    expect(days[0]).toEqual({ letter: "M", state: "done" });
    expect(days[1].state).toBe("rest"); // Tuesday, no session
    expect(days[2].state).toBe("today"); // Wednesday
    expect(days[3].state).toBe("future"); // Thursday
    expect(days[6].letter).toBe("S"); // Sunday
  });
});
