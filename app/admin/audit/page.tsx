"use client";

import { Suspense } from "react";
import { AdminAudit } from "@/components/admin/AdminAudit";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading audit…" />}>
      <AdminAudit />
    </Suspense>
  );
}
