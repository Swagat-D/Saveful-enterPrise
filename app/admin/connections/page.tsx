"use client";

import { Suspense } from "react";
import { AdminConnections } from "@/components/admin/AdminConnections";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminConnectionsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading connections…" />}>
      <AdminConnections />
    </Suspense>
  );
}
