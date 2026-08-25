"use client";

import { use } from "react";
import { CollectionDetail } from "@/components/activity/CollectionDetail";
import { RequireCapability } from "@/components/layout/RequireCapability";

export default function CollectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireCapability permission="viewActivity">
      <CollectionDetail id={id} />
    </RequireCapability>
  );
}
