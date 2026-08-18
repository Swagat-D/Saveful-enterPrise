"use client";

import { AppPage } from "@/components/layout/AppPage";
import { PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { demoListings } from "@/lib/demo";

export default function CollectionHistoryPage() {
  const collected = demoListings.filter((listing) => listing.status === "COLLECTED");

  return (
    <AppPage
      eyebrow="Collections"
      title="Collection history"
      description="Completed pickups across HQ and branches."
    >
      <PortalPanel title="Completed pickups" subtitle={`${collected.length} collections`}>
        <div className="space-y-3">
          {collected.map((listing) => (
            <article
              key={listing.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#FCFCFA] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <h2 className="font-saveful-bold text-base text-gray-900">{listing.title}</h2>
                <p className="mt-1 font-saveful text-sm text-gray-600">
                  {listing.siteName} · {listing.quantityKg} kg
                </p>
              </div>
              <StatusBadge tone="green">Collected</StatusBadge>
            </article>
          ))}
        </div>
      </PortalPanel>
    </AppPage>
  );
}
