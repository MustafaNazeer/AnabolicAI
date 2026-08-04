import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { NOTIFICATION_DEFAULTS } from "@/lib/notifications/types";

vi.mock("@/lib/notifications/actions", () => ({
  saveSubscription: vi.fn(),
  removeSubscription: vi.fn(),
  updateNotificationSettings: vi.fn(),
}));

describe("rest notification setting", () => {
  it("defaults to on", () => {
    expect(NOTIFICATION_DEFAULTS.notif_rest_push).toBe(true);
  });

  // A regex, not an exact string. Row puts the label and the note inside one
  // <label>, so the accessible name is the two concatenated, and an exact
  // match on the label alone would find nothing. Matching on the note's
  // wording is also what separates this from the "Sound" row, which is a
  // different setting that also mentions rests.
  it("offers a toggle gated behind the master switch", () => {
    render(
      <NotificationSettings
        initial={{ ...NOTIFICATION_DEFAULTS, notif_master: true }}
      />,
    );
    const box = screen.getByRole("checkbox", { name: /even if the app is closed/i });
    expect(box).toBeInTheDocument();
    expect(box).not.toBeDisabled();
  });
});
