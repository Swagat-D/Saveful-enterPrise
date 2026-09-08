"use client";

import { Suspense, use, useEffect, useState } from "react";
import { AppPage } from "@/components/layout/AppPage";
import { SiteForm } from "@/components/sites/SiteForm";
import { Button } from "@/components/ui/button";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { getOrganisationSiteDetails } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { demoSites } from "@/lib/demo";
import { siteFromApiRow } from "@/lib/enterpriseLive";
import { sitePermissions } from "@/lib/permissions";
import { scopeFromUser, siteInScope } from "@/lib/scope";
import type { OrganizationSite } from "@/types/enterprise";

export default function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense fallback={<SavefulPageLoader message="Loading site…" />}>
      <EditSite id={id} />
    </Suspense>
  );
}

function EditSite({ id }: { id: string }) {
  const user = useSession();
  const scope = scopeFromUser(user);
  const permissions = sitePermissions(user);
  const [remoteSite, setRemoteSite] = useState<OrganizationSite | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!/^\d+$/.test(id)) {
      setRemoteSite(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getOrganisationSiteDetails(Number(id))
      .then((detail) => {
        if (cancelled) return;
        setRemoteSite(
          siteFromApiRow({
            ...detail.site,
            managers: detail.managers ?? detail.site.managers,
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setRemoteSite(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const cached = demoSites.find((item) => item.id === id);
  const site = remoteSite ?? cached ?? null;
  const allowed = Boolean(site && (remoteSite || siteInScope(site, scope)));

  if (!user || loading) {
    return (
      <AppPage title="Edit site">
        <SavefulPageLoader message="Loading site…" />
      </AppPage>
    );
  }

  if (!site || !allowed) {
    return (
      <AppPage title="Site not found" description="This site is outside your scope or does not exist.">
        <Button href="/sites" variant="secondary">
          Back to sites
        </Button>
      </AppPage>
    );
  }

  if (!permissions.edit) {
    return (
      <AppPage title="You cannot edit this site" description="This action is limited by your role and scope.">
        <Button href={`/sites/${site.id}`} variant="secondary">
          Back
        </Button>
      </AppPage>
    );
  }

  return <SiteForm mode="edit" site={site} />;
}
