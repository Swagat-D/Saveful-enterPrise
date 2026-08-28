"use client";

import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminDashboardPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading admin…" />}>
      <AdminDashboard />
    </Suspense>
  );
}
