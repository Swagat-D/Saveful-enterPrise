"use client";

import type { ReactNode } from "react";
import { Clock3, MapPin, Package, Truck } from "lucide-react";
import { StatusPill } from "@/components/admin/AdminChrome";
import type { AdminCollection, AdminListing } from "@/lib/admin";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/dates";
import { formatKg } from "@/lib/impact";

export function pickupWindow(from?: string | null, to?: string | null) {
  if (!from && !to) return "—";
  if (from && to) return `${formatDisplayDateTime(from)} – ${formatDisplayDateTime(to)}`;
  return formatDisplayDateTime(from || to || undefined);
}

export function listingChipStatus(listing: AdminListing) {
  const collected = (listing.claims ?? []).some((claim) => claim.status === "COLLECTED");
  if (collected && (listing.remainingQtyKg ?? 0) <= 0) return "COLLECTED";
  const status = listing.status.toLowerCase();
  if (status === "collected" || status === "completed") return "COLLECTED";
  if (status === "claimed" || status === "driver_assigned" || status === "partial") return "CLAIMED";
  if (status === "expired") return "EXPIRED";
  if (status === "cancelled") return "CANCELLED";
  return "ACTIVE";
}

export function collectionChipStatus(row: AdminCollection) {
  const raw = (row.claimStatus || row.status || "").toUpperCase();
  if (raw === "COMPLETED") return "COLLECTED";
  if (raw === "CLAIMED" || raw === "SCHEDULED") return "PENDING";
  if (raw === "IN_PROGRESS") return "CONFIRMED";
  return raw || "PENDING";
}

export function AdminListingPanel({
  listing,
  orgName,
  siteName,
}: {
  listing: AdminListing;
  orgName?: string;
  siteName?: string;
}) {
  const items = listing.items?.length ? listing.items : listing.food ? [{ name: listing.food, totalQtyKg: listing.quantityKg }] : [];
  const claims = listing.claims ?? [];
  const sourceName = [orgName, siteName].filter(Boolean).join(" · ") || siteName || "—";
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Clock3} label="Listed" value={listing.createdAt ? formatDisplayDateTime(listing.createdAt) : "—"} />
        <Metric icon={Package} label="Best before" value={listing.bestBefore ? formatDisplayDate(listing.bestBefore) : "—"} />
        <Metric icon={Clock3} label="Pickup window" value={pickupWindow(listing.pickupFromTime, listing.pickupByTime)} />
        <Metric icon={MapPin} label="Remaining" value={`${formatKg(listing.remainingQtyKg ?? 0)} of ${formatKg(listing.quantityKg)}`} />
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
          <DetailTable
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
        <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-400">
          Listing source{listing.code ? ` · ${listing.code}` : ""}
        </p>
        <p className="mt-1 font-saveful text-sm text-gray-800">{sourceName}</p>
        <p className="mt-0.5 font-saveful text-xs text-gray-500">
          {[listing.pickupAddress, listing.pickupPostcode].filter(Boolean).join(", ") || "—"}
        </p>
      </div>
    </div>
  );
}

export function AdminCollectionPanel({ row, siteName }: { row: AdminCollection; siteName?: string }) {
  const items = row.items?.length ? row.items : row.food ? [{ name: row.food, totalQtyKg: row.quantityKg }] : [];
  const fromName = row.providerName || siteName || "—";
  return (
    <div className="space-y-3">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Package} label="From" value={fromName} />
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
          Listing source{row.listingCode ? ` · ${row.listingCode}` : row.listingId ? ` · #${row.listingId}` : ""}
        </p>
        <p className="mt-1 font-saveful text-sm text-gray-800">
          {fromName}
          {row.siteName ? ` · ${row.siteName}` : siteName ? ` · ${siteName}` : ""}
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

function DetailTable({
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
