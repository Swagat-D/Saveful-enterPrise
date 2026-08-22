"use client";

import { Suspense, use } from "react";
import { AppPage } from "@/components/layout/AppPage";
import { SiteWorkspace } from "@/components/sites/SiteWorkspace";
import { Button } from "@/components/ui/button";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { useSession } from "@/lib/auth";
import { demoSites } from "@/lib/demo";
import { scopeFromUser, siteInScope } from "@/lib/scope";

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
  const user = useSession();
  const scope = scopeFromUser(user);
  const site = demoSites.find((item) => item.id === id && siteInScope(item, scope));

  if (!user) {
    return <SavefulPageLoader message="Loading site…" />;
  }

  if (!site) {
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
