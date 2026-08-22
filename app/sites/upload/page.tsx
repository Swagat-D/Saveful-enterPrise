"use client";

import { AppPage } from "@/components/layout/AppPage";
import { BulkUploadFlow } from "@/components/sites/BulkUploadFlow";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { sitePermissions } from "@/lib/permissions";

export default function BulkUploadPage() {
  const user = useSession();
  const permissions = sitePermissions(user);

  if (!user) {
    return (
      <AppPage title="Bulk upload sites">
        <p className="font-saveful text-sm text-gray-500">Loading…</p>
      </AppPage>
    );
  }

  if (!permissions.bulkUpload) {
    return (
      <AppPage title="You cannot bulk upload sites" description="This action is limited by your role and scope.">
        <Button href="/sites" variant="secondary">
          Back to sites
        </Button>
      </AppPage>
    );
  }

  return <BulkUploadFlow />;
}
