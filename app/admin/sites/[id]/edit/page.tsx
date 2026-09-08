"use client";

import { Suspense, use, useEffect, useState } from "react";
import { SiteForm } from "@/components/sites/SiteForm";
import { AdminPortalShell } from "@/components/layout/AdminPortalShell";
import { PortalPageShell } from "@/components/ui/Portal";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { getSite, organizationSiteFromAdmin, refreshSites, useAdminVersion } from "@/lib/admin";

export default function AdminEditSitePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading site…" />}>
      <AdminEditSite id={id} />
    </Suspense>
  );
}

function AdminEditSite({ id }: { id: string }) {
  useAdminVersion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void refreshSites().finally(() => setReady(true));
  }, []);

  const adminSite = getSite(id);

  if (!ready && !adminSite) {
    return <SavefulPageLoader message="Loading site…" />;
  }

  if (!adminSite) {
    return (
      <AdminPortalShell>
        <PortalPageShell>
          <p className="font-saveful text-sm text-gray-500">This site was not found.</p>
        </PortalPageShell>
      </AdminPortalShell>
    );
  }

  return (
    <SiteForm
      mode="edit"
      variant="admin"
      site={organizationSiteFromAdmin(adminSite)}
      defaultOrganisationId={adminSite.orgId}
    />
  );
}
