"use client";

import { Suspense } from "react";
import { ActivityWorkspace } from "@/components/activity/ActivityWorkspace";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function ActivityPage() {
  return (
    <RequireCapability permission="viewActivity">
      <Suspense fallback={<SavefulPageLoader message="Loading activity…" />}>
        <ActivityWorkspace />
      </Suspense>
    </RequireCapability>
  );
}
