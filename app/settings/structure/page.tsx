"use client";

import { Suspense } from "react";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { OrganisationStructure } from "@/components/settings/OrganisationStructure";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function OrganisationStructurePage() {
  return (
    <RequireCapability permission="manageStructure">
      <Suspense fallback={<SavefulPageLoader message="Loading structure…" />}>
        <OrganisationStructure />
      </Suspense>
    </RequireCapability>
  );
}
