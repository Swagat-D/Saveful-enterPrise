"use client";

import { Suspense } from "react";
import { AdminPlans } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminPlansPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading plans…" />}>
      <AdminPlans />
    </Suspense>
  );
}
