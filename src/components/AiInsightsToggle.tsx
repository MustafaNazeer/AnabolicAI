"use client";

import { setAiInsights } from "@/lib/ai/insights/actions";
import { AiToggle } from "@/components/AiToggle";

export function AiInsightsToggle({ initial }: { initial: boolean }) {
  return (
    <AiToggle
      label="Weekly insights"
      description="Writes short observations on the dashboard. Sends up to your five most recently trained lifts and your weekly counts, only when you ask."
      initial={initial}
      save={setAiInsights}
    />
  );
}
