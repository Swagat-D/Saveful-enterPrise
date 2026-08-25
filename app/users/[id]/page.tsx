"use client";

import { use } from "react";
import { RequireCapability } from "@/components/layout/RequireCapability";
import { UserWorkspace } from "@/components/users/UserWorkspace";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireCapability permission="manageUsers">
      <UserWorkspace userId={id} />
    </RequireCapability>
  );
}
