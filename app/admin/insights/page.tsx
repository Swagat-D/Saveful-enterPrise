"use client";

import { Suspense } from "react";
import { AdminInsights } from "@/components/admin/AdminInsights";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminInsightsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading insights…" />}>
      <AdminInsights />
    </Suspense>
  );
}
