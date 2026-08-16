import { describe, it, expect } from "vitest";
import { VAPID_SUBJECT } from "@/lib/notifications/push";

describe("VAPID subject", () => {
  it("points at the current canonical origin", () => {
    expect(VAPID_SUBJECT).toBe("https://anabolicai.app");
  });

  it("is an https URI, which the push services require of the sub claim", () => {
    expect(VAPID_SUBJECT.startsWith("https://")).toBe(true);
  });
});
