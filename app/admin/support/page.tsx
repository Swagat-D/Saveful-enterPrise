"use client";

import { Suspense } from "react";
import { AdminSupport } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminSupportPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading support…" />}>
      <AdminSupport />
    </Suspense>
  );
}
