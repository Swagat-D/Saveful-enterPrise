"use client";

import { AppPage } from "@/components/layout/AppPage";
import { demoListings } from "@/lib/demo";

export default function SurplusPage() {
  const active = demoListings.filter((listing) => listing.status === "ACTIVE" || listing.status === "CLAIMED");

  return (
    <AppPage
      eyebrow="Listings"
      title="Surplus"
      description="Live surplus still waiting for pickup across your sites."
    >
      <div className="grid gap-3 md:grid-cols-2">
        {active.map((listing) => (
          <article key={listing.id} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <p className="font-saveful text-xs uppercase tracking-wide text-gray-500">{listing.siteName}</p>
            <h2 className="mt-1 font-saveful-bold text-lg text-gray-900">{listing.title}</h2>
            <p className="mt-2 font-saveful text-sm text-gray-600">
              {listing.quantityKg} kg still available · {listing.pickupWindow}
            </p>
          </article>
        ))}
      </div>
    </AppPage>
  );
}
