"use client";

import { Suspense } from "react";
import { AdminOrganisations } from "@/components/admin/AdminOrganisations";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminOrganisationsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading organisations…" />}>
      <AdminOrganisations />
    </Suspense>
  );
}
