import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { NotificationSettings } from "@/components/NotificationSettings";
import { NOTIFICATION_DEFAULTS } from "@/lib/notifications/types";

vi.mock("@/lib/notifications/actions", () => ({
  saveSubscription: vi.fn(),
  removeSubscription: vi.fn(),
  updateNotificationSettings: vi.fn(),
}));
vi.mock("@/lib/notifications/subscribe", () => ({
  enablePush: vi.fn(),
  disablePush: vi.fn(),
}));

describe("the rest timer sound setting", () => {
  it("is usable without push notifications enabled", () => {
    render(
      <NotificationSettings
        initial={{ ...NOTIFICATION_DEFAULTS, notif_master: false }}
      />,
    );

    const box = screen.getByRole("checkbox", { name: /Sound/ });
    // The whole point of the move: it is not gated on the push master switch.
    expect(box).not.toBeDisabled();
    expect(box).toBeChecked();
  });

  // iOS Safari does not implement the Vibration API, so the label must not
  // promise a haptic this app's only target device cannot produce.
  it("does not promise a vibration", () => {
    render(<NotificationSettings initial={{ ...NOTIFICATION_DEFAULTS }} />);
    expect(screen.queryByText(/vibration/i)).toBeNull();
  });

  it("says what it does and what it does not do", () => {
    render(<NotificationSettings initial={{ ...NOTIFICATION_DEFAULTS }} />);
    expect(
      screen.getByText("When a rest ends, while the app is open"),
    ).toBeInTheDocument();
    // The old wording promised a notification that never fired.
    expect(screen.queryByText("Foreground only for now")).not.toBeInTheDocument();
  });

  it("is no longer one of the push notification toggles", () => {
    render(<NotificationSettings initial={{ ...NOTIFICATION_DEFAULTS }} />);
    // A regex, not an exact string. Row puts the label and the note inside one
    // <label>, so the old checkbox's accessible name was the two concatenated,
    // and an exact match on "Rest timer" would pass before the change too.
    expect(screen.queryByRole("checkbox", { name: /Rest timer/ })).toBeNull();
  });
});
