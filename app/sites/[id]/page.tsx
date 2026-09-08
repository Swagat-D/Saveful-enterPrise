"use client";

import { Suspense, use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppPage } from "@/components/layout/AppPage";
import { SiteWorkspace } from "@/components/sites/SiteWorkspace";
import { Button } from "@/components/ui/button";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { getOrganisationSiteDetails } from "@/lib/api";
import { useSession } from "@/lib/auth";
import { demoSites } from "@/lib/demo";
import { siteFromApiRow } from "@/lib/enterpriseLive";
import { scopeFromUser, siteInScope } from "@/lib/scope";
import type { OrganizationSite } from "@/types/enterprise";

export default function SiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  return (
    <Suspense fallback={<SavefulPageLoader message="Loading site…" />}>
      <SiteDetail id={id} />
    </Suspense>
  );
}

function SiteDetail({ id }: { id: string }) {
  const router = useRouter();
  const user = useSession();
  const scope = scopeFromUser(user);
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
  const assignedIds = (scope.siteIds ?? []).filter(Boolean);
  const fallbackId = assignedIds.length === 1 && assignedIds[0] !== id ? assignedIds[0] : null;

  useEffect(() => {
    if (loading || site || !fallbackId) return;
    router.replace(`/sites/${fallbackId}`);
  }, [fallbackId, loading, router, site]);

  if (!user || (loading && !site) || (!site && fallbackId)) {
    return <SavefulPageLoader message="Loading site…" />;
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

  return <SiteWorkspace site={site} user={user} scope={scope} />;
}
