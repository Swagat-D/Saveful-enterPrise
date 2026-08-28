"use client";

import { Suspense } from "react";
import { AdminProvision } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminProvisionPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading provisioning…" />}>
      <AdminProvision />
    </Suspense>
  );
}
