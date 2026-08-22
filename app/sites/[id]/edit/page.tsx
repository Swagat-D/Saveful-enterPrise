"use client";

import { use } from "react";
import { AppPage } from "@/components/layout/AppPage";
import { SiteForm } from "@/components/sites/SiteForm";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { demoSites } from "@/lib/demo";
import { sitePermissions } from "@/lib/permissions";
import { scopeFromUser, siteInScope } from "@/lib/scope";

export default function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const user = useSession();
  const scope = scopeFromUser(user);
  const permissions = sitePermissions(user);
  const site = demoSites.find((item) => item.id === id && siteInScope(item, scope));

  if (!user) {
    return (
      <AppPage title="Edit site">
        <p className="font-saveful text-sm text-gray-500">Loading…</p>
      </AppPage>
    );
  }

  if (!site || !permissions.edit) {
    return (
      <AppPage
        title={!site ? "Site not found" : "You cannot edit this site"}
        description="This action is limited by your role and scope."
      >
        <Button href={site ? `/sites/${site.id}` : "/sites"} variant="secondary">
          Back
        </Button>
      </AppPage>
    );
  }

  return <SiteForm mode="edit" site={site} />;
}
