"use client";

import { Suspense } from "react";
import { AdminSites } from "@/components/admin/AdminSites";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminSitesPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading sites…" />}>
      <AdminSites />
    </Suspense>
  );
}
