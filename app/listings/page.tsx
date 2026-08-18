"use client";

import Link from "next/link";
import { AppPage } from "@/components/layout/AppPage";
import { demoListings } from "@/lib/demo";

const statusClass: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  CLAIMED: "bg-blue-50 text-blue-700",
  COLLECTED: "bg-saveful-green/10 text-saveful-green",
  EXPIRED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-50 text-red-700",
  PARTIAL: "bg-amber-50 text-amber-700",
};

export default function ListingsPage() {
  return (
    <AppPage
      eyebrow="Surplus"
      title="Listings"
      description="See surplus across every site. Filter by audience and status, then open a listing to edit or track collection."
      actions={
        <Link
          href="/listings/new"
          className="rounded-xl bg-saveful-green px-4 py-2.5 font-saveful-semibold text-white"
        >
          Create listing
        </Link>
      }
    >
      <div className="flex flex-wrap gap-2">
        {["Active", "All", "Claimed", "Collected", "Expired"].map((filter) => (
          <button
            key={filter}
            type="button"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 font-saveful text-xs text-gray-700"
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="space-y-3">
        {demoListings.map((listing) => (
          <article key={listing.id} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-saveful text-xs uppercase tracking-wide text-gray-500">
                  {listing.siteName}
                </p>
                <h2 className="mt-1 font-saveful-bold text-lg text-gray-900">{listing.title}</h2>
                <p className="mt-1 font-saveful text-sm text-gray-600">{listing.pickupWindow}</p>
              </div>
              <span className={`rounded-full px-3 py-1 font-saveful text-xs ${statusClass[listing.status]}`}>
                {listing.status}
              </span>
            </div>
            <p className="mt-3 font-saveful text-sm text-gray-500">
              {listing.quantityKg} kg · {listing.audience === "ANIMAL" ? "Animals" : "People"}
            </p>
          </article>
        ))}
      </div>
    </AppPage>
  );
}
