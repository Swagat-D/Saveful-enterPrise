"use client";

import { Suspense } from "react";
import { InsightsWorkspace } from "@/components/insights/InsightsWorkspace";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function InsightsPage() {
  return (
    <RequireCapability permission="viewInsights">
      <Suspense fallback={<SavefulPageLoader message="Loading insights…" />}>
        <InsightsWorkspace />
      </Suspense>
    </RequireCapability>
  );
}
