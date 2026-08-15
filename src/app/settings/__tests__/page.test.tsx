import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

const {
  getVerifiedUserMock,
  getNotificationSettingsMock,
  getAiQuickEntryMock,
  getAiPlateauMock,
  getAiInsightsMock,
  getApprovedMock,
  getUntaggedCustomExercisesMock,
} = vi.hoisted(() => ({
  getVerifiedUserMock: vi.fn(),
  getNotificationSettingsMock: vi.fn(),
  getAiQuickEntryMock: vi.fn(),
  getAiPlateauMock: vi.fn(),
  getAiInsightsMock: vi.fn(),
  getApprovedMock: vi.fn(),
  getUntaggedCustomExercisesMock: vi.fn(),
}));

vi.mock("@/lib/auth/user", () => ({ getVerifiedUser: getVerifiedUserMock }));
vi.mock("@/lib/notifications/queries", () => ({
  getNotificationSettings: getNotificationSettingsMock,
}));
vi.mock("@/lib/ai/queries", () => ({
  getAiQuickEntry: getAiQuickEntryMock,
  getAiPlateau: getAiPlateauMock,
  getAiInsights: getAiInsightsMock,
}));
vi.mock("@/lib/accounts/queries", () => ({ getApproved: getApprovedMock }));
vi.mock("@/lib/data/queries", () => ({
  getUntaggedCustomExercises: getUntaggedCustomExercisesMock,
}));

// The three actions the toggles save through. Mocked so the real modules,
// which are server only, never load into jsdom. Nothing here clicks anything;
// this file is about what renders.
vi.mock("@/lib/ai/actions", () => ({ setAiQuickEntry: vi.fn() }));
vi.mock("@/lib/ai/plateau/actions", () => ({ setAiPlateau: vi.fn() }));
vi.mock("@/lib/ai/insights/actions", () => ({ setAiInsights: vi.fn() }));

// Everything on this page that is not the AI section is stubbed, including the
// controls that need a theme or appearance provider to render at all. The AI
// wrappers, AiToggle and SettingsSection are deliberately left real, because
// the property under test is that `approved` survives the whole way from the
// page down to each of the three checkboxes.
vi.mock("@/components/NotificationSettings", () => ({
  NotificationSettings: () => <div />,
}));
vi.mock("@/components/UntaggedExercises", () => ({
  UntaggedExercises: () => <div />,
}));
vi.mock("@/components/ExportPanel", () => ({ ExportPanel: () => <div /> }));
vi.mock("@/components/ThemePicker", () => ({ ThemePicker: () => <div /> }));
vi.mock("@/components/AppearanceControl", () => ({
  AppearanceControl: () => <div />,
}));
vi.mock("@/components/SignOutButton", () => ({ SignOutButton: () => <div /> }));

import SettingsPage from "@/app/settings/page";

// One per AI toggle. Named individually rather than counted, because the point
// is that no single one of them can quietly lose the property: each of the
// three wrappers, and the page line that feeds it, is its own drop point, and
// the type is optional and defaults to approved, so a dropped prop compiles
// and lints clean.
const TOGGLES = [/ai quick entry/i, /plateau suggestions/i, /weekly insights/i];

async function renderSettings() {
  render(await SettingsPage());
  // Every settings group starts closed, and a closed group is inert.
  fireEvent.click(screen.getByRole("button", { name: "AI" }));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
  getVerifiedUserMock.mockResolvedValue({ id: "u1", email: "a@b.com" });
  getNotificationSettingsMock.mockResolvedValue({});
  // All three off, which is what an account that has never been approved has:
  // the consent columns default false.
  getAiQuickEntryMock.mockResolvedValue({ enabled: false, visible: true });
  getAiPlateauMock.mockResolvedValue({ enabled: false, visible: true });
  getAiInsightsMock.mockResolvedValue({ enabled: false, visible: true });
  getApprovedMock.mockResolvedValue(true);
  getUntaggedCustomExercisesMock.mockResolvedValue([]);
});

describe("the settings page AI section", () => {
  it("locks all three toggles for an unapproved account", async () => {
    getApprovedMock.mockResolvedValue(false);
    await renderSettings();
    for (const name of TOGGLES) {
      expect(screen.getByRole("checkbox", { name })).toBeDisabled();
    }
  });

  // The counterpart, so the test above cannot pass by everything being
  // disabled for reasons that have nothing to do with approval.
  it("leaves all three toggles usable for an approved account", async () => {
    getApprovedMock.mockResolvedValue(true);
    await renderSettings();
    for (const name of TOGGLES) {
      expect(screen.getByRole("checkbox", { name })).toBeEnabled();
    }
  });

  // The explanation travels with the lock, on every row rather than one of
  // them, since each row is disabled on its own.
  it("tells an unapproved account why, on every row", async () => {
    getApprovedMock.mockResolvedValue(false);
    await renderSettings();
    expect(screen.getAllByText(/waiting to be approved/i)).toHaveLength(3);
  });

  // A revoked account keeps whatever consent it had, so its rows stay
  // switchable off. This is the page level half of the one directional lock.
  it("still lets an unapproved account turn off a feature that is on", async () => {
    getApprovedMock.mockResolvedValue(false);
    getAiInsightsMock.mockResolvedValue({ enabled: true, visible: true });
    await renderSettings();
    expect(
      screen.getByRole("checkbox", { name: /weekly insights/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole("checkbox", { name: /ai quick entry/i }),
    ).toBeDisabled();
  });

  // THE TRAP THIS SECTION IS BUILT AROUND. The switch removes the three AI
  // surfaces from the rest of the app, and if it removed this section too it
  // would take its own undo with it: someone who hid everything and later
  // wanted just quick entry back would have to remember a switch exists and
  // find it in a section showing nothing.
  it("keeps the AI section and all four rows when the features are hidden", async () => {
    getAiQuickEntryMock.mockResolvedValue({ enabled: false, visible: false });
    getAiPlateauMock.mockResolvedValue({ enabled: false, visible: false });
    getAiInsightsMock.mockResolvedValue({ enabled: false, visible: false });
    await renderSettings();

    expect(
      screen.getByRole("checkbox", { name: /show ai features/i }),
    ).not.toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: /ai quick entry/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /plateau/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: /weekly insights/i }),
    ).toBeInTheDocument();
  });

  // Hiding costs nothing to run, so it is the one control in this section an
  // unapproved account may always use. Gating it would be perverse: the lock
  // notice sits on the very rows this switch exists to clear away.
  it("leaves the visibility switch usable by an unapproved account", async () => {
    getApprovedMock.mockResolvedValue(false);
    await renderSettings();
    expect(
      screen.getByRole("checkbox", { name: /show ai features/i }),
    ).toBeEnabled();
  });
});
