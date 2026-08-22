"use client";

import { Suspense } from "react";
import { InsightsView } from "@/components/insights/InsightsView";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function InsightsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading insights…" />}>
      <InsightsView />
    </Suspense>
  );
}
