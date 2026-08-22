"use client";

import { ActivityFeed } from "@/components/activity/ActivityFeed";
import { AppPage } from "@/components/layout/AppPage";

export default function ActivityPage() {
  return (
    <AppPage
      eyebrow="Operations"
      title="Activity"
      description="Claims, pickups, invites, and site alerts across the organisation."
    >
      <ActivityFeed />
    </AppPage>
  );
}
