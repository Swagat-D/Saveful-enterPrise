"use client";

import { Suspense, use } from "react";
import { AdminListingDetail } from "@/components/admin/AdminRecords";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading listing…" />}>
      <AdminListingDetail id={id} />
    </Suspense>
  );
}
