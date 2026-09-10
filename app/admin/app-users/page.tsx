"use client";

import { Suspense } from "react";
import { AdminAppUsers } from "@/components/admin/AdminAppUsers";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminAppUsersPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading app users…" />}>
      <AdminAppUsers />
    </Suspense>
  );
}
