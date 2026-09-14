"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Clock3, MapPin, Package, Truck } from "lucide-react";
import { AdminSection, StatusPill } from "@/components/admin/AdminChrome";
import type { AdminCollection, AdminListing } from "@/lib/admin";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/dates";
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

function pickupWindow(from?: string | null, to?: string | null) {
  if (!from && !to) return "—";
  if (from && to) return `${formatDisplayDateTime(from)} – ${formatDisplayDateTime(to)}`;
  return formatDisplayDateTime(from || to || undefined);
}

function listingChipStatus(listing: AdminListing) {
  const status = listing.status.toLowerCase();
  if (status === "collected" || status === "completed") return "COLLECTED";
  if (status === "claimed" || status === "driver_assigned" || status === "partial") return "CLAIMED";
  if (status === "expired") return "EXPIRED";
  if (status === "cancelled") return "CANCELLED";
  return "ACTIVE";
}

function collectionChipStatus(row: AdminCollection) {
  const raw = (row.claimStatus || row.status || "").toUpperCase();
  if (raw === "COMPLETED") return "COLLECTED";
  if (raw === "CLAIMED" || raw === "SCHEDULED") return "PENDING";
  if (raw === "IN_PROGRESS") return "CONFIRMED";
  return raw || "PENDING";
}

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
                  {open ? <ListingDetail listing={listing} siteName={siteName} /> : null}
                </article>
              );
            })}
          </div>
        )}
      </AdminSection>
    </div>
  );
}

function ListingDetail({ listing, siteName }: { listing: AdminListing; siteName: string }) {
  const items = listing.items?.length ? listing.items : listing.food ? [{ name: listing.food, totalQtyKg: listing.quantityKg }] : [];
  const claims = listing.claims ?? [];
  return (
    <div className="space-y-3 border-t border-gray-100 px-3.5 py-3.5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Clock3} label="Listed" value={listing.createdAt ? formatDisplayDateTime(listing.createdAt) : "—"} />
        <Metric icon={Package} label="Best before" value={listing.bestBefore ? formatDisplayDate(listing.bestBefore) : "—"} />
        <Metric icon={Clock3} label="Pickup window" value={pickupWindow(listing.pickupFromTime, listing.pickupByTime)} />
        <Metric icon={MapPin} label="Remaining" value={formatKg(listing.remainingQtyKg ?? 0)} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length ? (
          items.map((item) => (
            <span key={`${listing.id}-${item.name}`} className="rounded-full bg-white px-2.5 py-1 font-saveful text-xs text-gray-700 ring-1 ring-black/[0.06]">
              {item.name}
              <span className="ml-1 text-gray-400">{formatKg(item.totalQtyKg)}</span>
            </span>
          ))
        ) : (
          <span className="font-saveful text-sm text-gray-500">No food items</span>
        )}
      </div>
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-black/[0.04]">
        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
          <Truck className="h-3.5 w-3.5 text-saveful-green" />
          <p className="font-saveful-semibold text-xs uppercase tracking-wide text-gray-600">Claims and collections</p>
        </div>
        {claims.length ? (
          <Table
            columns={["Claimant", "Status", "Kg", "Collected", "Collected by"]}
            rows={claims.map((claim) => [
              <span key={`${claim.id}-who`} className="block font-saveful-semibold text-sm text-gray-900">
                {claim.claimantName || "—"}
              </span>,
              <StatusPill key={`${claim.id}-status`} status={claim.status} />,
              formatKg(claim.collectedKg),
              claim.collectedAt ? formatDisplayDateTime(claim.collectedAt) : "—",
              <span key={`${claim.id}-by`}>
                <span className="block text-sm text-gray-800">{claim.collectedBy || claim.claimantName || "—"}</span>
                {claim.driverName ? <span className="block font-saveful text-[11px] text-gray-400">Driver {claim.driverName}</span> : null}
              </span>,
            ])}
          />
        ) : (
          <p className="px-3 py-6 text-center font-saveful text-sm text-gray-500">No claims on this listing yet.</p>
        )}
      </div>
      <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/[0.04]">
        <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-400">Listed from</p>
        <p className="mt-1 font-saveful text-sm text-gray-800">{siteName}</p>
        <p className="mt-0.5 font-saveful text-xs text-gray-500">
          {[listing.pickupAddress, listing.pickupPostcode].filter(Boolean).join(", ") || "—"}
        </p>
      </div>
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
                  {open ? <CollectionDetail row={row} siteName={siteName} /> : null}
                </article>
              );
            })}
          </div>
        )}
      </AdminSection>
    </div>
  );
}

function CollectionDetail({ row, siteName }: { row: AdminCollection; siteName: string }) {
  const items = row.items?.length ? row.items : row.food ? [{ name: row.food, totalQtyKg: row.quantityKg }] : [];
  return (
    <div className="space-y-3 border-t border-gray-100 px-3.5 py-3.5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Package} label="From" value={row.providerName || siteName} />
        <Metric icon={MapPin} label="Pickup address" value={[row.pickupAddress, row.pickupPostcode].filter(Boolean).join(", ") || "—"} />
        <Metric icon={Clock3} label="Pickup window" value={pickupWindow(row.pickupFromTime, row.pickupByTime)} />
        <Metric icon={Clock3} label="Collected" value={row.collectedAt ? formatDisplayDateTime(row.collectedAt) : "Not collected yet"} />
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Package} label="Listed" value={row.listingCreatedAt ? formatDisplayDateTime(row.listingCreatedAt) : "—"} />
        <Metric icon={Package} label="Best before" value={row.bestBefore ? formatDisplayDate(row.bestBefore) : "—"} />
        <Metric
          icon={Package}
          label="Listing total"
          value={
            row.listingTotalKg != null
              ? `${formatKg(row.listingTotalKg)}${row.listingRemainingKg != null ? ` · ${formatKg(row.listingRemainingKg)} left` : ""}`
              : "—"
          }
        />
        <Metric icon={Truck} label="Collected by" value={row.driverName ? `Driver ${row.driverName}` : row.recipientName} />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.length ? (
          items.map((item) => (
            <span key={`${row.id}-${item.name}`} className="rounded-full bg-white px-2.5 py-1 font-saveful text-xs text-gray-700 ring-1 ring-black/[0.06]">
              {item.name}
              <span className="ml-1 text-gray-400">{formatKg(item.totalQtyKg)}</span>
            </span>
          ))
        ) : (
          <span className="font-saveful text-sm text-gray-500">No food items</span>
        )}
      </div>
      <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/[0.04]">
        <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-400">
          Listing source{row.listingCode ? ` · ${row.listingCode}` : ""}
        </p>
        <p className="mt-1 font-saveful text-sm text-gray-800">
          {row.providerName || siteName}
          {row.siteName ? ` · ${row.siteName}` : ""}
        </p>
        <p className="mt-0.5 font-saveful text-xs text-gray-500">{row.pickupAddress || "—"}</p>
        {row.driverName ? <p className="mt-1 font-saveful text-xs text-gray-600">Driver {row.driverName}</p> : null}
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value }: { icon: typeof Clock3; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/[0.04]">
      <p className="flex items-center gap-1.5 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </p>
      <p className="mt-1 font-saveful text-sm text-gray-800">{value}</p>
    </div>
  );
}

function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
            {columns.map((column) => (
              <th key={column} className="px-3 py-2.5 font-saveful">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className="border-b border-gray-50 last:border-0">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-3 font-saveful text-sm text-gray-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
