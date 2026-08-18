"use client";

import { useState } from "react";
import { Cloud, Truck, UtensilsCrossed, Wheat } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { PortalChip, PortalPanel, PortalStatCard } from "@/components/ui/Portal";
import { demoSites } from "@/lib/demo";

export default function InsightsPage() {
  const [siteId, setSiteId] = useState("all");

  return (
    <AppPage
      eyebrow="Impact"
      title="Insights"
      description="Organisation-wide impact, with a site filter for branch-level analytics."
    >
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1">
        <PortalChip active={siteId === "all"} onClick={() => setSiteId("all")}>
          All sites
        </PortalChip>
        {demoSites.map((site) => (
          <PortalChip
            key={site.id}
            active={siteId === site.id}
            onClick={() => setSiteId(site.id)}
          >
            {site.name}
          </PortalChip>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <PortalStatCard label="Food redistributed" value="128 kg" hint="All time" icon={Wheat} />
        <PortalStatCard label="Meals created" value="256" hint="Estimated from listings" icon={UtensilsCrossed} accent="teal" />
        <PortalStatCard label="CO₂ avoided" value="84 kg" hint="All time" icon={Cloud} accent="slate" />
        <PortalStatCard label="Collections" value="19" hint="Completed pickups" icon={Truck} accent="orange" />
      </div>

      <PortalPanel
        title="Weekly pulse"
        subtitle="Placeholder chart area — same card style as India web dashboards"
      >
        <div className="flex h-[240px] items-center justify-center rounded-xl bg-gray-50 px-4 text-center">
          <p className="font-saveful text-sm text-gray-500">
            Impact charts will connect to the business analytics API next.
          </p>
        </div>
      </PortalPanel>
    </AppPage>
  );
}
