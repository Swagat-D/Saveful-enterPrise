"use client";

import { Suspense } from "react";
import { AdminListings } from "@/components/admin/AdminRecords";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminListingsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading listings…" />}>
      <AdminListings />
    </Suspense>
  );
}
