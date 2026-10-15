"use client";

import { RequireCapability } from "@/components/layout/RequireCapability";
import { NotificationsSettings } from "@/components/settings/NotificationsSettings";

export default function NotificationsSettingsPage() {
  return (
    <RequireCapability permission="viewSettings">
      <NotificationsSettings />
    </RequireCapability>
  );
}
