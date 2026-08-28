"use client";

import { Suspense, use } from "react";
import { AdminSiteDetail } from "@/components/admin/AdminSiteDetail";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading site…" />}>
      <AdminSiteDetail id={id} />
    </Suspense>
  );
}
