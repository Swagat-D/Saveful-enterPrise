"use client";

import { Suspense } from "react";
import { AdminRoles } from "@/components/admin/AdminRoles";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminRolesPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading roles…" />}>
      <AdminRoles />
    </Suspense>
  );
}
