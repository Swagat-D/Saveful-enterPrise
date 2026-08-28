"use client";

import { Suspense, use } from "react";
import { AdminCollectionDetail } from "@/components/admin/AdminRecords";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminCollectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading collection…" />}>
      <AdminCollectionDetail id={id} />
    </Suspense>
  );
}
