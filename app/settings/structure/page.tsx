"use client";

import { Building2, GitBranch } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { demoOrganization, demoSites } from "@/lib/demo";
import { demoGroups, lookupOrgNames } from "@/lib/network";

export default function OrganisationStructurePage() {
  const names = lookupOrgNames();
  const hq = demoSites.find((site) => site.siteType === "head_office");

  return (
    <AppPage
      eyebrow="Enterprise Settings"
      title="Organisation Structure"
      description="Group, territory and cluster are independent labels. Historical reports keep the classification from the time of each collection."
      actions={
        <Button href="/sites/new" className="w-full sm:w-auto">
          Add location
        </Button>
      }
    >
      <PortalPanel
        title={demoOrganization.name}
        subtitle="Head office owns reporting. Branches inherit organisation settings."
      >
        {hq ? (
          <div className="rounded-2xl border border-saveful-green/15 bg-saveful-green/5 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-saveful-green shadow-sm">
                <Building2 className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-saveful-bold text-gray-900">{hq.name}</h3>
                  <StatusBadge tone="green">Head office</StatusBadge>
                </div>
                <p className="mt-1 font-saveful text-sm text-gray-500">{hq.address}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-5 space-y-5">
          {demoGroups.map((group) => {
            const groupSites = demoSites.filter((site) => site.groupId === group.id);
            if (!groupSites.length) return null;
            return (
              <section key={group.id}>
                <h3 className="font-saveful-bold text-sm text-gray-900">{group.name}</h3>
                <div className="relative mt-3 space-y-3 border-l-2 border-saveful-green/15 pl-5">
                  {groupSites.map((site) => (
                    <div
                      key={site.id}
                      className="rounded-2xl border border-gray-100 bg-[#FCFCFA] p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 text-saveful-green">
                          <GitBranch className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="font-saveful-semibold text-gray-900">{site.name}</h4>
                            <StatusBadge tone={site.status === "active" ? "green" : "slate"}>
                              {site.status === "active" ? "Active" : "Deactivated"}
                            </StatusBadge>
                            <StatusBadge tone={site.hasManager ? "green" : "amber"}>
                              {site.hasManager ? "Managed" : "Needs setup"}
                            </StatusBadge>
                          </div>
                          <p className="mt-1 font-saveful text-sm text-gray-500">
                            {names.territoryName(site.territoryId)} · {names.clusterName(site.clusterId)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </PortalPanel>
    </AppPage>
  );
}
