"use client";

import { setNewAccountNotification } from "@/lib/accounts/actions";
import { AiToggle } from "@/components/AiToggle";

// Lives on the accounts screen rather than the Settings notification list,
// because only an admin ever receives this notification.
export function NewAccountNotificationToggle({ initial }: { initial: boolean }) {
  return (
    <AiToggle
      label="New account signups"
      description="Push a notification here when someone signs up and needs approval."
      initial={initial}
      save={setNewAccountNotification}
    />
  );
}
