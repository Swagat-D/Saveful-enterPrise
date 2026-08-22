"use client";

import { Suspense } from "react";
import { OrganisationStructure } from "@/components/settings/OrganisationStructure";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function OrganisationStructurePage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading structure…" />}>
      <OrganisationStructure />
    </Suspense>
  );
}
