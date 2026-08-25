"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { useSession } from "@/lib/auth";
import { roleHas } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import { PortalChip, PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { demoListings } from "@/lib/demo";
import type { ListingStatus } from "@/types/enterprise";

const filters: { key: "all" | ListingStatus; label: string }[] = [
  { key: "ACTIVE", label: "Active" },
  { key: "all", label: "All" },
  { key: "CLAIMED", label: "Claimed" },
  { key: "COLLECTED", label: "Collected" },
  { key: "EXPIRED", label: "Expired" },
];

const statusTone: Record<ListingStatus, "green" | "amber" | "blue" | "red" | "slate"> = {
  ACTIVE: "green",
  PARTIAL: "amber",
  CLAIMED: "blue",
  COLLECTED: "green",
  EXPIRED: "slate",
  CANCELLED: "red",
};

export default function ListingsPage() {
  const user = useSession();
  const [filter, setFilter] = useState<(typeof filters)[number]["key"]>("ACTIVE");
  const rows =
    filter === "all"
      ? demoListings
      : demoListings.filter((listing) => listing.status === filter);

  return (
    <AppPage
      eyebrow="Surplus"
      title="Listings"
      description="See surplus across every site. Filter by status, then track claims and collections."
      actions={
        roleHas(user, "createListings") ? (
          <Link href="/listings/new">
            <Button>
              <Plus className="h-4 w-4" />
              Create listing
            </Button>
          </Link>
        ) : undefined
      }
    >
      <PortalPanel
        title="Organisation listings"
        subtitle={`${rows.length} shown`}
        action={
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap">
            {filters.map((item) => (
              <PortalChip
                key={item.key}
                active={filter === item.key}
                onClick={() => setFilter(item.key)}
              >
                {item.label}
              </PortalChip>
            ))}
          </div>
        }
      >
        <div className="space-y-3">
          {rows.map((listing) => (
            <article
              key={listing.id}
              className="flex flex-col gap-3 rounded-2xl border border-gray-100 bg-[#FCFCFA] p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                  {listing.siteName}
                </p>
                <h2 className="mt-1 font-saveful-bold text-base text-gray-900 sm:text-lg">
                  {listing.title}
                </h2>
                <p className="mt-1 font-saveful text-sm text-gray-600">
                  {listing.quantityKg} kg · {listing.audience === "ANIMAL" ? "Animals" : "People"} · {listing.pickupWindow}
                </p>
              </div>
              <StatusBadge tone={statusTone[listing.status]}>{listing.status}</StatusBadge>
            </article>
          ))}
          {rows.length === 0 ? (
            <p className="rounded-xl bg-gray-50 px-4 py-10 text-center font-saveful text-sm text-gray-500">
              No listings in this filter yet.
            </p>
          ) : null}
        </div>
      </PortalPanel>
    </AppPage>
  );
}
