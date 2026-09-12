"use client";

import { Suspense, use } from "react";
import { AdminAppOrganisation } from "@/components/admin/AdminAppOrganisation";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminAppOrganisationPage({ params }: { params: Promise<{ orgId: string }> }) {
  const { orgId } = use(params);
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading organisation…" />}>
      <AdminAppOrganisation organisationId={orgId} />
    </Suspense>
  );
}
