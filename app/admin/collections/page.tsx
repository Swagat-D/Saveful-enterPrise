"use client";

import { Suspense } from "react";
import { AdminCollections } from "@/components/admin/AdminRecords";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminCollectionsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading collections…" />}>
      <AdminCollections />
    </Suspense>
  );
}
