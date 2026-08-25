"use client";

import { Suspense } from "react";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { RolesPermissions } from "@/components/settings/RolesPermissions";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function RolesPermissionsPage() {
  return (
    <RequireCapability permission="manageSettings">
      <Suspense fallback={<SavefulPageLoader message="Loading roles…" />}>
        <RolesPermissions />
      </Suspense>
    </RequireCapability>
  );
}
