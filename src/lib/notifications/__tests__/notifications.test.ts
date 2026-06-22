import { describe, it, expect } from "vitest";
import { prCelebrationPayload } from "@/lib/notifications/payloads";
import { shouldSendPr } from "@/lib/notifications/gate";
import { urlBase64ToUint8Array } from "@/lib/notifications/vapid";

describe("prCelebrationPayload", () => {
  it("builds a plain-language PR push that opens the dashboard", () => {
    expect(prCelebrationPayload("Bench Press", 185, 5)).toEqual({
      title: "New personal record",
      body: "Bench Press: 185 lbs x 5",
      url: "/",
      tag: "pr",
    });
  });
});

describe("shouldSendPr", () => {
  it("requires the master and PR toggles both on", () => {
    expect(shouldSendPr({ notif_master: true, notif_pr: true })).toBe(true);
    expect(shouldSendPr({ notif_master: false, notif_pr: true })).toBe(false);
    expect(shouldSendPr({ notif_master: true, notif_pr: false })).toBe(false);
  });
});

describe("urlBase64ToUint8Array", () => {
  it("decodes base64url to the right bytes", () => {
    const out = urlBase64ToUint8Array("AQID"); // bytes 1, 2, 3
    expect(Array.from(out)).toEqual([1, 2, 3]);
  });
});
