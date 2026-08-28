"use client";

import { Suspense } from "react";
import { AdminActivity } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminActivityPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading activity…" />}>
      <AdminActivity />
    </Suspense>
  );
}
