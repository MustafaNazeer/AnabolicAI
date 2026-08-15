import { describe, it, expect } from "vitest";
import { shouldSendNewAccount } from "@/lib/notifications/gate";
import { newAccountPayload } from "@/lib/notifications/payloads";

describe("shouldSendNewAccount", () => {
  it("sends only when the master switch and the type switch are both on", () => {
    expect(
      shouldSendNewAccount({ notif_master: true, notif_new_account: true }),
    ).toBe(true);
    expect(
      shouldSendNewAccount({ notif_master: false, notif_new_account: true }),
    ).toBe(false);
    expect(
      shouldSendNewAccount({ notif_master: true, notif_new_account: false }),
    ).toBe(false);
  });
});

describe("newAccountPayload", () => {
  it("names the email and opens the accounts screen", () => {
    const payload = newAccountPayload("stranger@c.com");
    expect(payload.title).toBe("New account");
    expect(payload.body).toContain("stranger@c.com");
    expect(payload.url).toBe("/settings/accounts");
    expect(payload.tag).toBe("new-account");
  });
});
