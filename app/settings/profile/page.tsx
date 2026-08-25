"use client";

import { OrganisationProfile } from "@/components/settings/OrganisationProfile";
import { RequireCapability } from "@/components/layout/RequireCapability";

export default function OrganisationProfilePage() {
  return (
    <RequireCapability permission="manageSettings">
      <OrganisationProfile />
    </RequireCapability>
  );
}
