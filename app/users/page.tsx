"use client";

import { Suspense } from "react";
import { UsersAccess } from "@/components/users/UsersAccess";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function UsersPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading users…" />}>
      <UsersAccess />
    </Suspense>
  );
}
