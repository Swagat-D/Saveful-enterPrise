"use client";

import { AppPage } from "@/components/layout/AppPage";
import { demoListings } from "@/lib/demo";

export default function CollectionHistoryPage() {
  const collected = demoListings.filter((listing) => listing.status === "COLLECTED");

  return (
    <AppPage
      eyebrow="Collections"
      title="Collection history"
      description="Completed pickups across HQ and branches."
    >
      <div className="space-y-3">
        {collected.map((listing) => (
          <article key={listing.id} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-saveful-bold text-lg text-gray-900">{listing.title}</h2>
                <p className="mt-1 font-saveful text-sm text-gray-600">
                  {listing.siteName} · {listing.quantityKg} kg
                </p>
              </div>
              <span className="rounded-full bg-saveful-green/10 px-3 py-1 font-saveful text-xs text-saveful-green">
                Collected
              </span>
            </div>
          </article>
        ))}
      </div>
    </AppPage>
  );
}
