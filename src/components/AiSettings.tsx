"use client";

import { useState } from "react";
import { setAiVisible } from "@/lib/ai/visibility";
import { AiToggle } from "@/components/AiToggle";
import { AiQuickEntryToggle } from "@/components/AiQuickEntryToggle";
import { AiPlateauToggle } from "@/components/AiPlateauToggle";
import { AiInsightsToggle } from "@/components/AiInsightsToggle";

// The whole AI section, as one client component, because the four rows share a
// piece of state: whether the features are shown at all. Turning the master off
// has to lock the three consent rows in the same interaction, and neither the
// server nor the individual toggles can carry that. Each AiToggle holds its
// `initial` in useState, so revalidated props would never reach it, and waiting
// on the round trip would leave three rows live for a moment after the surfaces
// they govern had already gone from the rest of the app.
//
// THIS SECTION ALWAYS RENDERS, whatever the switch says. It holds the undo for
// its own lock, so hiding or disabling it would strand anyone who turned
// everything off and later wanted one feature back.
export function AiSettings({
  visible,
  quickEntry,
  plateau,
  insights,
  approved,
}: {
  visible: boolean;
  quickEntry: boolean;
  plateau: boolean;
  insights: boolean;
  approved?: boolean;
}) {
  const [shown, setShown] = useState(visible);

  // Optimistic, then reverted if the write fails, matching what AiToggle does
  // with its own checkbox. Without the revert a failed write would leave three
  // rows locked against a master switch that had snapped back to on, which
  // claims a state the database does not have.
  async function saveVisible(next: boolean) {
    setShown(next);
    const result = await setAiVisible(next);
    if ("error" in result) setShown(!next);
    return result;
  }

  return (
    <div className="flex flex-col gap-3">
      <AiToggle
        label="Show AI features"
        description="Turn this off to remove quick entry, plateau suggestions and dashboard insights from the app. Your consent settings below are kept as they are and locked while the features are hidden, and nothing is sent to anyone in the meantime."
        initial={visible}
        save={saveVisible}
      />
      <AiQuickEntryToggle
        initial={quickEntry}
        approved={approved}
        locked={!shown}
      />
      <AiPlateauToggle initial={plateau} approved={approved} locked={!shown} />
      <AiInsightsToggle initial={insights} approved={approved} locked={!shown} />
    </div>
  );
}
