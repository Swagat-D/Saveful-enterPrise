"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { UserWorkspace } from "@/components/users/UserWorkspace";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function NewUserPage() {
  return (
    <RequireCapability permission="manageUsers">
      <Suspense fallback={<SavefulPageLoader message="Loading user…" />}>
        <NewUser />
      </Suspense>
    </RequireCapability>
  );
}

function NewUser() {
  const searchParams = useSearchParams();
  return <UserWorkspace presetSiteId={searchParams.get("site") ?? undefined} />;
}
