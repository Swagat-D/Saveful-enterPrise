"use client";

import { Suspense } from "react";
import { AdminMethodology } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminMethodologyPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading methodology…" />}>
      <AdminMethodology />
    </Suspense>
  );
}
