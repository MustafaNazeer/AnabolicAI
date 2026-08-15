"use client";

import { setAiInsights } from "@/lib/ai/insights/actions";
import { AiToggle } from "@/components/AiToggle";

export function AiInsightsToggle({
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
      label="Weekly insights"
      description="Writes short observations on the dashboard. Sends up to your five most recently trained lifts (name, muscle group, the app's own trend and stall verdict, and their last four sessions), plus your weekly counts and streak, only when you ask."
      initial={initial}
      save={setAiInsights}
      approved={approved}
      locked={locked}
    />
  );
}
