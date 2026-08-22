"use client";

import { use } from "react";
import { UserWorkspace } from "@/components/users/UserWorkspace";

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <UserWorkspace userId={id} />;
}
