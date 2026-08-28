"use client";

import { Suspense } from "react";
import { AdminGaps } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminGapsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading gaps…" />}>
      <AdminGaps />
    </Suspense>
  );
}
