"use client";

import { Suspense } from "react";
import { ReportBuilder } from "@/components/insights/ReportBuilder";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function NewReportPage() {
  return (
    <RequireCapability permission="createReports">
      <Suspense fallback={<SavefulPageLoader message="Loading report builder…" />}>
        <ReportBuilder />
      </Suspense>
    </RequireCapability>
  );
}
