"use client";

import { setAiQuickEntry } from "@/lib/ai/actions";
import { AiToggle } from "@/components/AiToggle";

export function AiQuickEntryToggle({ initial }: { initial: boolean }) {
  return (
    <AiToggle
      label="AI quick entry"
      description="Turns typed set descriptions into sets. Sends only what you type."
      initial={initial}
      save={setAiQuickEntry}
    />
  );
}
