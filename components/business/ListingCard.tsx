"use client";

import { Clock, Info, MapPin, Pencil, X } from "lucide-react";
import { LISTING_ICONS, ListingIcon } from "@/components/business/ListingIcon";
import type { ApiFoodListing } from "@/lib/api";
import {
  buildInstructions,
  formatClaimedOn,
  formatCollectedOn,
  formatExpiredOn,
  formatKg,
  formatPickupDateRange,
  formatPickupTime,
  getClaimedKg,
  getImpactText,
  getListingAudience,
  getListingStatusLabel,
  getRemainingKg,
  isListingActive,
  isListingClaimed,
  isListingCollected,
  isListingExpired,
  resolveListingStatus,
} from "@/lib/businessListings";
import { cn } from "@/lib/utils";

type Props = {
  listing: ApiFoodListing;
  cancelling?: boolean;
  onViewItems: () => void;
  onCancel?: () => void;
  onEdit?: () => void;
};

export function ListingCard({ listing, cancelling, onViewItems, onCancel, onEdit }: Props) {
  const animal = getListingAudience(listing) === "animal";
  const collected = isListingCollected(listing);
  const claimed = isListingClaimed(listing);
  const expired = isListingExpired(listing);
  const active = isListingActive(listing);
  const partial = resolveListingStatus(listing) === "PARTIAL";
  const statusLabel = getListingStatusLabel(listing);
  const accent = animal ? "text-orange-700" : "text-saveful-green";
  const banner = animal ? "bg-[#FFF6EC]" : "bg-[#F0F8F3]";
  const border = animal ? "border-[#FDDBB0]" : "border-[#C8E0D2]";
  const statusTone = expired
    ? "bg-[#FFF1D6] text-amber-700"
    : collected
      ? "bg-[#EEF7F2] text-saveful-green"
      : claimed
        ? "bg-[#E8F1FB] text-[#2F6FED]"
        : partial
          ? "bg-[#FFF8E1] text-[#B8860B]"
          : animal
            ? "bg-[#FFE8CC] text-orange-700"
            : "bg-[#D8EBDF] text-saveful-green";
  const dateLabel = collected
    ? "Collected on"
    : claimed
      ? "Claimed on"
      : expired
        ? "Expired on"
        : "Pickup dates";
  const dateValue = collected
    ? formatCollectedOn(listing)
    : claimed
      ? formatClaimedOn(listing)
      : expired
        ? formatExpiredOn(listing)
        : formatPickupDateRange(listing.pickupFromTime, listing.pickupByTime);

  return (
    <article className={cn("overflow-hidden rounded-2xl border bg-white", border)}>
      <div className={cn("flex flex-wrap items-center justify-between gap-2 px-4 py-2.5", banner)}>
        <span className={cn("rounded-full px-2.5 py-0.5 font-saveful-semibold text-[11px]", statusTone)}>
          {statusLabel}
        </span>
        <span className={cn("inline-flex items-center gap-1.5 font-saveful-semibold text-xs", accent)}>
          <ListingIcon src={animal ? LISTING_ICONS.animals : LISTING_ICONS.people} className="h-5 w-5" />
          {animal ? "For Animals" : "For People"}
        </span>
      </div>

      <div className="space-y-3 p-4">
        {active ? (
          <p className={cn("flex items-center gap-1.5 font-saveful text-xs", accent)}>
            <MapPin className="h-3.5 w-3.5" />
            {animal ? "Nearby farms have been notified" : "Nearby charities have been notified"}
          </p>
        ) : null}
        {claimed ? (
          <p className="flex items-center gap-1.5 font-saveful text-xs text-[#2F6FED]">
            <Clock className="h-3.5 w-3.5" />
            Claimed — awaiting collection
          </p>
        ) : null}
        {partial ? (
          <button
            type="button"
            onClick={onViewItems}
            className="flex w-full items-center gap-2 rounded-xl bg-[#FFF8E1] px-3 py-2 text-left font-saveful text-xs text-[#B8860B]"
          >
            <Info className="h-3.5 w-3.5 shrink-0" />
            Partially claimed — {formatKg(getClaimedKg(listing))} kg taken, {formatKg(getRemainingKg(listing))} kg
            remaining
          </button>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <MetaBox animal={animal} iconSrc={LISTING_ICONS.items} label="Items">
            <button
              type="button"
              onClick={onViewItems}
              className={cn(
                "mt-1 inline-flex h-7 items-center rounded-lg px-2.5 font-saveful-semibold text-[11px] text-white",
                animal ? "bg-orange-600" : "bg-saveful-green",
              )}
            >
              {partial ? "Breakdown" : "View all"}
            </button>
          </MetaBox>
          <MetaBox animal={animal} iconSrc={LISTING_ICONS.calendar} label={dateLabel}>
            <p className="mt-1 font-saveful text-xs text-gray-800">{dateValue}</p>
          </MetaBox>
          <MetaBox animal={animal} iconSrc={collected ? LISTING_ICONS.leaf : LISTING_ICONS.clock} label={collected ? "Impact" : "Pickup time"} wide>
            <p className="mt-1 font-saveful text-xs text-gray-800">
              {collected ? getImpactText(listing) : formatPickupTime(listing.pickupFromTime, listing.pickupByTime)}
            </p>
          </MetaBox>
        </div>

        {active ? (
          <p className={cn("flex items-start gap-1.5 rounded-xl border px-3 py-2 font-saveful text-xs", banner, border, accent)}>
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {buildInstructions(listing)}
          </p>
        ) : null}

        {active ? (
          <div className="flex flex-wrap gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 font-saveful-semibold text-sm",
                  animal ? "border-orange-300 text-orange-700" : "border-saveful-green/30 text-saveful-green",
                )}
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            ) : null}
            {onCancel ? (
              <button
                type="button"
                disabled={cancelling}
                onClick={onCancel}
                className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-red-200 px-3 font-saveful-semibold text-sm text-red-600 disabled:opacity-50"
              >
                <X className="h-3.5 w-3.5" />
                {cancelling ? "Cancelling…" : "Cancel"}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function MetaBox({
  animal,
  iconSrc,
  label,
  children,
  wide,
}: {
  animal: boolean;
  iconSrc: string;
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-xl border border-black/[0.04] bg-[#FBFBF8] px-3 py-2.5",
        wide && "sm:col-span-2",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          animal ? "bg-[#FFE8CC]" : "bg-[#D8EBDF]",
        )}
      >
        <ListingIcon src={iconSrc} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-saveful-semibold text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
        {children}
      </div>
    </div>
  );
}
