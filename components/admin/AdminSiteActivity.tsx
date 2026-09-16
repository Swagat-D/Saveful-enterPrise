"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { AdminSection, StatusPill } from "@/components/admin/AdminChrome";
import {
  AdminCollectionPanel,
  AdminListingPanel,
  collectionChipStatus,
  listingChipStatus,
  pickupWindow,
} from "@/components/admin/AdminRecordPanels";
import type { AdminCollection, AdminListing } from "@/lib/admin";
import { formatKg } from "@/lib/impact";
import { cn } from "@/lib/utils";

const PAGE_TABS = [
  { id: "listings", label: "Listings" },
  { id: "collections", label: "Collections" },
] as const;

const LISTING_STATUSES = [
  { id: "all", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "CLAIMED", label: "Claimed" },
  { id: "COLLECTED", label: "Collected" },
  { id: "EXPIRED", label: "Expired" },
  { id: "CANCELLED", label: "Cancelled" },
] as const;

const COLLECTION_STATUSES = [
  { id: "all", label: "All" },
  { id: "PENDING", label: "Pending" },
  { id: "CONFIRMED", label: "Confirmed" },
  { id: "COLLECTED", label: "Collected" },
  { id: "CANCELLED", label: "Cancelled" },
] as const;

export function AdminSiteActivity({
  siteName,
  listings,
  collections,
}: {
  siteName: string;
  listings: AdminListing[];
  collections: AdminCollection[];
}) {
  const [tab, setTab] = useState<(typeof PAGE_TABS)[number]["id"]>(
    listings.length === 0 && collections.length > 0 ? "collections" : "listings",
  );
  const [listingStatus, setListingStatus] = useState<(typeof LISTING_STATUSES)[number]["id"]>("all");
  const [collectionStatus, setCollectionStatus] = useState<(typeof COLLECTION_STATUSES)[number]["id"]>("all");
  const [openListingId, setOpenListingId] = useState<string | null>(null);
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);

  const listingCounts = useMemo(() => {
    const counts: Record<string, number> = { all: listings.length };
    for (const item of LISTING_STATUSES) {
      if (item.id === "all") continue;
      counts[item.id] = listings.filter((row) => listingChipStatus(row) === item.id).length;
    }
    return counts;
  }, [listings]);

  const collectionCounts = useMemo(() => {
    const counts: Record<string, number> = { all: collections.length };
    for (const item of COLLECTION_STATUSES) {
      if (item.id === "all") continue;
      counts[item.id] = collections.filter((row) => collectionChipStatus(row) === item.id).length;
    }
    return counts;
  }, [collections]);

  const visibleListings =
    listingStatus === "all" ? listings : listings.filter((row) => listingChipStatus(row) === listingStatus);
  const visibleCollections =
    collectionStatus === "all" ? collections : collections.filter((row) => collectionChipStatus(row) === collectionStatus);

  if (!listings.length && !collections.length) {
    return <p className="font-saveful text-sm text-gray-500">No listings or collections recorded for this site yet.</p>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {PAGE_TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "h-8 rounded-lg px-3 font-saveful-semibold text-xs transition",
              tab === item.id ? "bg-saveful-green text-white" : "bg-[#F7F6F2] text-gray-600 hover:bg-[#EFEDE6]",
            )}
          >
            {item.label}
            {item.id === "listings" ? ` · ${listings.length}` : null}
            {item.id === "collections" ? ` · ${collections.length}` : null}
          </button>
        ))}
      </div>

      {tab === "listings" ? (
        <Listings
          siteName={siteName}
          listings={visibleListings}
          counts={listingCounts}
          status={listingStatus}
          onStatus={setListingStatus}
          openId={openListingId}
          onToggle={setOpenListingId}
        />
      ) : (
        <Collections
          siteName={siteName}
          rows={visibleCollections}
          counts={collectionCounts}
          status={collectionStatus}
          onStatus={setCollectionStatus}
          openId={openCollectionId}
          onToggle={setOpenCollectionId}
        />
      )}
    </div>
  );
}

function Listings({
  siteName,
  listings,
  counts,
  status,
  onStatus,
  openId,
  onToggle,
}: {
  siteName: string;
  listings: AdminListing[];
  counts: Record<string, number>;
  status: (typeof LISTING_STATUSES)[number]["id"];
  onStatus: (next: (typeof LISTING_STATUSES)[number]["id"]) => void;
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {LISTING_STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onStatus(item.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 font-saveful-semibold text-xs transition",
              status === item.id ? "bg-saveful-green text-white" : "bg-[#F7F6F2] text-gray-600 hover:bg-[#EFEDE6]",
            )}
          >
            {item.label}
            <span className={cn("tabular-nums", status === item.id ? "text-white/80" : "text-gray-400")}>
              {counts[item.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <AdminSection title="Listings" action={<span className="font-saveful text-xs text-gray-500">{listings.length}</span>}>
        {listings.length === 0 ? (
          <p className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">No listings in this status.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {listings.map((listing) => {
              const open = openId === listing.id;
              return (
                <article key={listing.id} className={cn(open && "bg-[#FAF7F0]/70")}>
                  <button
                    type="button"
                    onClick={() => onToggle(open ? null : listing.id)}
                    className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-3.5 py-3 text-left hover:bg-[#FAF7F0] sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-saveful-semibold text-sm text-gray-900">{listing.code}</p>
                      <p className="truncate font-saveful text-xs text-gray-500">{listing.food}</p>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <p className="truncate font-saveful text-sm text-gray-800">{siteName}</p>
                      <p className="truncate font-saveful text-[11px] text-gray-400">{listing.pickupAddress || "—"}</p>
                    </div>
                    <p className="hidden font-saveful text-xs text-gray-500 lg:block">
                      {pickupWindow(listing.pickupFromTime, listing.pickupByTime)}
                    </p>
                    <p className="font-saveful-semibold text-sm tabular-nums text-gray-800">{formatKg(listing.quantityKg)}</p>
                    <span className="flex items-center justify-end gap-2">
                      <StatusPill status={listingChipStatus(listing)} />
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition", open && "rotate-180")} />
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-gray-100 px-3.5 py-3.5">
                      <AdminListingPanel listing={listing} siteName={siteName} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </AdminSection>
    </div>
  );
}

function Collections({
  siteName,
  rows,
  counts,
  status,
  onStatus,
  openId,
  onToggle,
}: {
  siteName: string;
  rows: AdminCollection[];
  counts: Record<string, number>;
  status: (typeof COLLECTION_STATUSES)[number]["id"];
  onStatus: (next: (typeof COLLECTION_STATUSES)[number]["id"]) => void;
  openId: string | null;
  onToggle: (id: string | null) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {COLLECTION_STATUSES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onStatus(item.id)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 font-saveful-semibold text-xs transition",
              status === item.id ? "bg-saveful-green text-white" : "bg-[#F7F6F2] text-gray-600 hover:bg-[#EFEDE6]",
            )}
          >
            {item.label}
            <span className={cn("tabular-nums", status === item.id ? "text-white/80" : "text-gray-400")}>
              {counts[item.id] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <AdminSection title="Collections" action={<span className="font-saveful text-xs text-gray-500">{rows.length}</span>}>
        {rows.length === 0 ? (
          <p className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">No collections in this status.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {rows.map((row) => {
              const open = openId === row.id;
              return (
                <article key={row.id} className={cn(open && "bg-[#FAF7F0]/70")}>
                  <button
                    type="button"
                    onClick={() => onToggle(open ? null : row.id)}
                    className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto_auto] items-center gap-3 px-3.5 py-3 text-left hover:bg-[#FAF7F0] sm:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="font-saveful-semibold text-sm text-gray-900">{row.recipientName}</p>
                      <p className="truncate font-saveful text-xs text-gray-500">{row.food}</p>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <p className="truncate font-saveful text-sm text-gray-800">{row.siteName || siteName}</p>
                      <p className="truncate font-saveful text-[11px] text-gray-400">{row.pickupAddress || "—"}</p>
                    </div>
                    <p className="hidden font-saveful text-xs text-gray-500 lg:block">
                      {pickupWindow(row.pickupFromTime, row.pickupByTime)}
                    </p>
                    <p className="font-saveful-semibold text-sm tabular-nums text-gray-800">{formatKg(row.quantityKg)}</p>
                    <span className="flex items-center justify-end gap-2">
                      <StatusPill status={collectionChipStatus(row)} />
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition", open && "rotate-180")} />
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-gray-100 px-3.5 py-3.5">
                      <AdminCollectionPanel row={row} siteName={siteName} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </AdminSection>
    </div>
  );
}
