"use client";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useAppearance } from "@/components/AppearanceProvider";
import { MODES, type Mode } from "@/lib/appearance";

const LABELS: Record<Mode, string> = {
  system: "System",
  light: "Light",
  dark: "Dark",
};

export function AppearanceControl() {
  const { mode, setMode } = useAppearance();
  return (
    <SegmentedControl<Mode>
      label="Appearance"
      value={mode}
      onChange={setMode}
      options={MODES.map((m) => ({ value: m, label: LABELS[m] }))}
    />
  );
}
