"use client";

import { setAiQuickEntry } from "@/lib/ai/actions";
import { AiToggle } from "@/components/AiToggle";

export function AiQuickEntryToggle({
  initial,
  approved,
  locked,
}: {
  initial: boolean;
  approved?: boolean;
  locked?: boolean;
}) {
  return (
    <AiToggle
      label="AI quick entry"
      description="Turns typed set descriptions into sets. Sends only what you type."
      initial={initial}
      save={setAiQuickEntry}
      approved={approved}
      locked={locked}
    />
  );
}
