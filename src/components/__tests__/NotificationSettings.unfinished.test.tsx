import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { NOTIFICATION_DEFAULTS } from "@/lib/notifications/types";

vi.mock("@/lib/notifications/actions", () => ({
  saveSubscription: vi.fn(),
  removeSubscription: vi.fn(),
  updateNotificationSettings: vi.fn(),
}));

describe("unfinished workout notification setting", () => {
  it("defaults to on", () => {
    expect(NOTIFICATION_DEFAULTS.notif_unfinished).toBe(true);
  });

  it("offers a toggle in settings", () => {
    render(<NotificationSettings initial={{ ...NOTIFICATION_DEFAULTS }} />);
    expect(
      screen.getByRole("checkbox", { name: /unfinished workout/i }),
    ).toBeInTheDocument();
  });
});
