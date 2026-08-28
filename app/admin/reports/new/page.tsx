"use client";

import { Suspense } from "react";
import { AdminCreateReport } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminCreateReportPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading report…" />}>
      <AdminCreateReport />
    </Suspense>
  );
}
