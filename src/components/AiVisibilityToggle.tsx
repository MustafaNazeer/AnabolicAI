"use client";

import { setAiVisible } from "@/lib/ai/visibility";
import { AiToggle } from "@/components/AiToggle";

// The master switch above the three consent rows. No `approved` prop, and that
// is the point: this is the one control in the AI section that an unapproved
// account may always use, because hiding a feature costs nothing to run.
//
// Worded as "show" rather than "hide" so the switch reads the same way round as
// every other toggle in Settings, where on means more rather than less. The
// description says outright that consent is untouched, because the case this
// has to survive is someone who has quick entry enabled, hides everything, and
// would otherwise be left believing they had also turned the sending off.
export function AiVisibilityToggle({ initial }: { initial: boolean }) {
  return (
    <AiToggle
      label="Show AI features"
      description="Turn this off to remove quick entry, plateau suggestions and dashboard insights from the app. Your consent settings below are left exactly as they are, and nothing is sent while they are hidden."
      initial={initial}
      save={setAiVisible}
    />
  );
}
