"use client";

import { use } from "react";
import { ListingDetail } from "@/components/activity/ListingDetail";
import { RequireCapability } from "@/components/layout/RequireCapability";

export default function ListingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return (
    <RequireCapability permission="viewActivity">
      <ListingDetail id={id} />
    </RequireCapability>
  );
}
