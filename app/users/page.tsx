"use client";

import { Suspense } from "react";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { UsersAccess } from "@/components/users/UsersAccess";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function UsersPage() {
  return (
    <RequireCapability permission="manageUsers">
      <Suspense fallback={<SavefulPageLoader message="Loading users…" />}>
        <UsersAccess />
      </Suspense>
    </RequireCapability>
  );
}
