"use client";

import { Suspense } from "react";
import { AdminNotifications } from "@/components/admin/AdminNotifications";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

export default function AdminNotificationsPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading notifications…" />}>
      <AdminNotifications />
    </Suspense>
  );
}
