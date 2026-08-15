"use client";

import { setAiPlateau } from "@/lib/ai/plateau/actions";
import { AiToggle } from "@/components/AiToggle";

export function AiPlateauToggle({
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
      label="Plateau suggestions"
      description="Suggests a next step when a lift stalls. Sends that lift's name, muscle group, and recent sessions, only when you ask."
      initial={initial}
      save={setAiPlateau}
      approved={approved}
      locked={locked}
    />
  );
}
