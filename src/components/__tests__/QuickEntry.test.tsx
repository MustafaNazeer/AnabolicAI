import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

const { parseQuickEntryMock, setAiQuickEntryMock, useOnlineMock } = vi.hoisted(
  () => ({
    parseQuickEntryMock: vi.fn(),
    setAiQuickEntryMock: vi.fn(),
    useOnlineMock: vi.fn(),
  }),
);
vi.mock("@/lib/ai/actions", () => ({
  parseQuickEntry: parseQuickEntryMock,
  setAiQuickEntry: setAiQuickEntryMock,
}));
vi.mock("@/lib/offline/useOnline", () => ({ useOnline: useOnlineMock }));

import { QuickEntry } from "@/components/QuickEntry";

const TWO_SETS = [
  { reps: 5, weight: 185, rirLow: 2, rirHigh: 2 },
  { reps: 4, weight: 185, rirLow: 2, rirHigh: 2 },
];

function setup(over: { aiEnabled?: boolean } = {}) {
  const onLog = vi.fn();
  const onAiEnabled = vi.fn();
  render(
    <QuickEntry
      aiEnabled={over.aiEnabled ?? true}
      onAiEnabled={onAiEnabled}
      onLog={onLog}
    />,
  );
  return { onLog, onAiEnabled };
}

function typeAndParse(text: string) {
  fireEvent.change(screen.getByPlaceholderText(/185 for 5/i), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: /add sets/i }));
}

beforeEach(() => {
  vi.clearAllMocks();
  useOnlineMock.mockReturnValue(true);
  setAiQuickEntryMock.mockResolvedValue({ ok: true });
  parseQuickEntryMock.mockResolvedValue({ ok: true, sets: TWO_SETS });
});

describe("QuickEntry", () => {
  it("disables the parse action with a hint while offline", () => {
    useOnlineMock.mockReturnValue(false);
    setup();
    expect(screen.getByRole("button", { name: /add sets/i })).toBeDisabled();
    expect(screen.getByText(/back online/i)).toBeInTheDocument();
  });

  it("shows the consent notice first when AI is off, and parses after enabling", async () => {
    const { onAiEnabled } = setup({ aiEnabled: false });
    typeAndParse("185 for 5, then 4");
    // Nothing sent yet: the notice gates the first use.
    expect(parseQuickEntryMock).not.toHaveBeenCalled();
    expect(screen.getByText(/only what you type/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));
    await waitFor(() => expect(setAiQuickEntryMock).toHaveBeenCalledWith(true));
    expect(onAiEnabled).toHaveBeenCalled();
    await waitFor(() =>
      expect(parseQuickEntryMock).toHaveBeenCalledWith("185 for 5, then 4"),
    );
  });

  // The gap that let a type error through: nothing exercised the failure arm
  // of enable(), so the widened `string | undefined` return went unnoticed.
  it("shows the error and sends nothing when enabling consent fails", async () => {
    setAiQuickEntryMock.mockResolvedValue({ error: "could not save" });
    setup({ aiEnabled: false });
    typeAndParse("185 for 5");
    fireEvent.click(screen.getByRole("button", { name: /^enable$/i }));
    await waitFor(() =>
      expect(screen.getByText(/could not save/i)).toBeInTheDocument(),
    );
    expect(parseQuickEntryMock).not.toHaveBeenCalled();
  });

  it("cancelling the notice sends nothing", () => {
    setup({ aiEnabled: false });
    typeAndParse("185 for 5");
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(setAiQuickEntryMock).not.toHaveBeenCalled();
    expect(parseQuickEntryMock).not.toHaveBeenCalled();
  });

  it("renders one editable preview row per parsed set", async () => {
    setup();
    typeAndParse("185 for 5, then 4 at 2 RIR");
    await waitFor(() =>
      expect(screen.getAllByLabelText(/preview reps/i)).toHaveLength(2),
    );
    expect(screen.getAllByLabelText(/preview weight/i)[0]).toHaveValue("185");
  });

  it("confirm logs every row through onLog in order and clears", async () => {
    const { onLog } = setup();
    typeAndParse("185 for 5, then 4 at 2 RIR");
    await waitFor(() => screen.getByRole("button", { name: /log 2 sets/i }));
    fireEvent.click(screen.getByRole("button", { name: /log 2 sets/i }));
    await waitFor(() => expect(onLog).toHaveBeenCalledTimes(2));
    expect(onLog).toHaveBeenNthCalledWith(1, TWO_SETS[0]);
    expect(onLog).toHaveBeenNthCalledWith(2, TWO_SETS[1]);
    await waitFor(() =>
      expect(screen.queryByLabelText(/preview reps/i)).not.toBeInTheDocument(),
    );
  });

  // The invariant behind the "every set said Set 1" defect. logSetLocal reads
  // the store to derive a set number, so a second call must not begin until
  // the first has finished writing.
  it("does not start the next row until the previous one has settled", async () => {
    let releaseFirst!: () => void;
    const first = new Promise<void>((res) => {
      releaseFirst = res;
    });
    const onLog = vi.fn().mockImplementationOnce(() => first);
    render(
      <QuickEntry aiEnabled={true} onAiEnabled={() => {}} onLog={onLog} />,
    );
    fireEvent.change(screen.getByPlaceholderText(/185 for 5/i), {
      target: { value: "185 for 5, then 4" },
    });
    fireEvent.click(screen.getByRole("button", { name: /add sets/i }));
    await waitFor(() => screen.getByRole("button", { name: /log 2 sets/i }));
    fireEvent.click(screen.getByRole("button", { name: /log 2 sets/i }));

    await waitFor(() => expect(onLog).toHaveBeenCalledTimes(1));
    // The first is still pending, so the second must not have been attempted.
    await Promise.resolve();
    expect(onLog).toHaveBeenCalledTimes(1);

    releaseFirst();
    await waitFor(() => expect(onLog).toHaveBeenCalledTimes(2));
  });

  it("an edited preview row logs the edited numbers", async () => {
    const { onLog } = setup();
    typeAndParse("185 for 5, then 4");
    await waitFor(() => screen.getAllByLabelText(/preview reps/i));
    fireEvent.change(screen.getAllByLabelText(/preview reps/i)[0], {
      target: { value: "6" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log 2 sets/i }));
    expect(onLog).toHaveBeenNthCalledWith(1, { ...TWO_SETS[0], reps: 6 });
  });

  // The rail that keeps a hand edited row from reaching logSet with numbers
  // logSet would reject. Same bounds as validate.ts, applied after editing.
  it("blocks the confirm when an edit puts a row out of bounds", async () => {
    const { onLog } = setup();
    typeAndParse("185 for 5, then 4");
    await waitFor(() => screen.getAllByLabelText(/preview reps/i));
    fireEvent.change(screen.getAllByLabelText(/preview reps/i)[0], {
      target: { value: "0" },
    });
    fireEvent.click(screen.getByRole("button", { name: /log 2 sets/i }));
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.getByText(/highlighted numbers/i)).toBeInTheDocument();
  });

  it("discard clears the preview and logs nothing", async () => {
    const { onLog } = setup();
    typeAndParse("185 for 5");
    await waitFor(() => screen.getByRole("button", { name: /discard/i }));
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(onLog).not.toHaveBeenCalled();
    expect(screen.queryByLabelText(/preview reps/i)).not.toBeInTheDocument();
  });

  it("shows the action's error copy on failure", async () => {
    parseQuickEntryMock.mockResolvedValue({
      ok: false,
      error: "Could not read any sets in that.",
    });
    setup();
    typeAndParse("gibberish");
    await waitFor(() =>
      expect(screen.getByText(/could not read any sets/i)).toBeInTheDocument(),
    );
  });
});
