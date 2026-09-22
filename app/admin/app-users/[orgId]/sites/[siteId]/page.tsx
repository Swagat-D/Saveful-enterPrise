"use client";

import { Suspense, use } from "react";
import { AdminAppOrganisation } from "@/components/admin/AdminAppOrganisation";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminAppSitePage({
  params,
}: {
  params: Promise<{ orgId: string; siteId: string }>;
}) {
  const { orgId, siteId } = use(params);
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading site…" />}>
      <AdminAppOrganisation organisationId={orgId} siteId={siteId} />
    </Suspense>
  );
}
