"use client";

import { Suspense } from "react";
import { AdminExceptions } from "@/components/admin/AdminNavPages";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminExceptionsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading exceptions…" />}>
      <AdminExceptions />
    </Suspense>
  );
}
