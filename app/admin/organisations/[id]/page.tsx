"use client";

import { Suspense, use } from "react";
import { AdminOrganisationDetail } from "@/components/admin/AdminOrganisationDetail";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminOrganisationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading organisation…" />}>
      <AdminOrganisationDetail id={id} />
    </Suspense>
  );
}
