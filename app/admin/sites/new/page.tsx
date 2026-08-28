"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { SiteForm } from "@/components/sites/SiteForm";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminCreateSitePage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading add site…" />}>
      <AdminCreateSite />
    </Suspense>
  );
}

function AdminCreateSite() {
  const searchParams = useSearchParams();
  const organisationId = searchParams.get("organisationId") || searchParams.get("org") || undefined;
  return <SiteForm mode="create" variant="admin" defaultOrganisationId={organisationId} />;
}
