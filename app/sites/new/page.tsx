"use client";

import { AppPage } from "@/components/layout/AppPage";
import { SiteForm } from "@/components/sites/SiteForm";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { sitePermissions } from "@/lib/permissions";

export default function CreateSitePage() {
  const user = useSession();
  const permissions = sitePermissions(user);

  if (!user) {
    return (
      <AppPage title="Add site">
        <p className="font-saveful text-sm text-gray-500">Loading…</p>
      </AppPage>
    );
  }

  if (!permissions.addSite) {
    return (
      <AppPage title="You cannot add a site" description="This action is limited by your role and scope.">
        <Button href="/sites" variant="secondary">
          Back to sites
        </Button>
      </AppPage>
    );
  }

  return <SiteForm mode="create" />;
}
