"use client";

import { Suspense } from "react";
import { AuditWorkspace } from "@/components/audit/AuditWorkspace";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AuditLogPage() {
  return (
    <RequireCapability permission="viewAudit">
      <Suspense fallback={<SavefulPageLoader message="Loading audit log…" />}>
        <AuditWorkspace />
      </Suspense>
    </RequireCapability>
  );
}
