"use client";

import { Suspense } from "react";
import { AdminNetworkHealth } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminNetworkPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading network health…" />}>
      <AdminNetworkHealth />
    </Suspense>
  );
}
