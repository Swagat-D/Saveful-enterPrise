"use client";

import { AppPage } from "@/components/layout/AppPage";
import { PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { demoListings } from "@/lib/demo";

export default function SurplusPage() {
  const active = demoListings.filter(
    (listing) => listing.status === "ACTIVE" || listing.status === "CLAIMED",
  );

  return (
    <AppPage
      eyebrow="Listings"
      title="Surplus"
      description="Live surplus still waiting for pickup across your sites."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {active.map((listing) => (
          <PortalPanel key={listing.id} title={listing.title} subtitle={listing.siteName}>
            <p className="font-saveful text-sm text-gray-600">
              {listing.quantityKg} kg still available · {listing.pickupWindow}
            </p>
            <div className="mt-4">
              <StatusBadge tone={listing.status === "CLAIMED" ? "blue" : "green"}>
                {listing.status}
              </StatusBadge>
            </div>
          </PortalPanel>
        ))}
      </div>
    </AppPage>
  );
}
