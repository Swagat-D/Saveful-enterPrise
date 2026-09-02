"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Clock3, Plus } from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { LISTING_ICONS, ListingIcon } from "@/components/business/ListingIcon";
import { ListingCard } from "@/components/business/ListingCard";
import { ListingItemsModal } from "@/components/business/ListingItemsModal";
import { PortalPageHeader, PortalPageShell } from "@/components/ui/Portal";
import { Button } from "@/components/ui/button";
import type { ApiFoodItem, ApiFoodListing } from "@/lib/api";
import { cancelBusinessListing, getBusinessListing, listBusinessListings, listBusinessSiteListings } from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import { isBusinessMultiHeadOffice, parseLiveSiteId, pickDefaultSiteId } from "@/lib/businessHqSite";
import {
  LISTING_STATUS_PRIORITY,
  compareListingsByNewest,
  isAnimalListing,
  isListingActive,
  isPeopleListing,
  listingFromPayload,
  listingsFromPayload,
  matchesStatusFilter,
  resolveListingStatus,
  type ListingAudienceFilter,
  type ListingStatusFilter,
} from "@/lib/businessListings";
import { cn } from "@/lib/utils";

const STATUS_FILTERS: { key: ListingStatusFilter; label: string }[] = [
  { key: "active", label: "Active" },
  { key: "all", label: "All" },
  { key: "claimed", label: "Claimed" },
  { key: "expired", label: "Expired" },
  { key: "collected", label: "Collected" },
  { key: "cancelled", label: "Cancelled" },
];

export default function BusinessListingsPage() {
  return (
    <BusinessGate>
      <ListingsInner />
    </BusinessGate>
  );
}

function ListingsInner() {
  const user = useBusinessSession();
  const [rows, setRows] = useState<ApiFoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [audience, setAudience] = useState<ListingAudienceFilter>("all");
  const [status, setStatus] = useState<ListingStatusFilter>("active");
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [itemsOpen, setItemsOpen] = useState<ApiFoodListing | null>(null);
  const [detailItems, setDetailItems] = useState<ApiFoodItem[] | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!user) return;
    if (!opts?.silent) setLoading(true);
    setError("");
    const hq = isBusinessMultiHeadOffice(user) || user.role === "restaurant_multi";
    try {
      if (hq) {
        const hqId = pickDefaultSiteId(user.profile?.sites) ?? parseLiveSiteId(user.siteId);
        const all = listingsFromPayload(await listBusinessListings(user.organisationId));
        setRows(hqId == null ? all : all.filter((row) => Number(row.siteId) === hqId));
      } else {
        setRows(listingsFromPayload(await listBusinessSiteListings()));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load listings.");
      setRows([]);
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const peopleCount = rows.filter((row) => isPeopleListing(row)).length;
  const animalCount = rows.filter((row) => isAnimalListing(row)).length;

  const filtered = useMemo(() => {
    let result = rows;
    if (audience === "people") result = result.filter((row) => isPeopleListing(row));
    if (audience === "animals") result = result.filter((row) => isAnimalListing(row));
    result = result.filter((row) => matchesStatusFilter(row, status));
    if (status === "all") {
      return [...result].sort((a, b) => {
        const order = LISTING_STATUS_PRIORITY[resolveListingStatus(a)] - LISTING_STATUS_PRIORITY[resolveListingStatus(b)];
        return order !== 0 ? order : compareListingsByNewest(a, b);
      });
    }
    return [...result].sort(compareListingsByNewest);
  }, [audience, rows, status]);

  const openItems = async (listing: ApiFoodListing) => {
    setItemsOpen(listing);
    setDetailItems(listing.foodItems ?? []);
    if (resolveListingStatus(listing) !== "PARTIAL") return;
    setDetailLoading(true);
    try {
      const detail = listingFromPayload(await getBusinessListing(listing.id));
      setDetailItems(detail?.foodItems ?? listing.foodItems ?? []);
    } catch {
      setDetailItems(listing.foodItems ?? []);
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <PortalPageShell>
      <PortalPageHeader
        eyebrow="Surplus"
        title="Listings"
        description="Food you have listed for pickup. Charities and recovery partners see live listings in the app."
        actions={
          <>
            <Button href="/business/listings/history" variant="secondary">
              <Clock3 className="h-4 w-4" />
              History
            </Button>
            <Button href="/business/listings/new">
              <Plus className="h-4 w-4" />
              List surplus
            </Button>
          </>
        }
      />

      <section className="rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">Audience</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["all", "All", rows.length],
                  ["people", "For people", peopleCount],
                  ["animals", "For animals", animalCount],
                ] as const
              ).map(([key, label, count]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setAudience(key)}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-xl border px-3 font-saveful-semibold text-sm transition",
                    audience === key
                      ? key === "animals"
                        ? "border-orange-300 bg-[#FFF6EC] text-orange-800"
                        : "border-saveful-green/30 bg-saveful-green/10 text-saveful-green"
                      : "border-black/[0.06] bg-[#F7F6F2] text-gray-600 hover:border-saveful-green/20 hover:bg-white",
                  )}
                >
                  {key === "people" ? <ListingIcon src={LISTING_ICONS.people} className="h-4 w-4" /> : null}
                  {key === "animals" ? <ListingIcon src={LISTING_ICONS.animals} className="h-4 w-4" /> : null}
                  {label}
                  <span className={cn("tabular-nums", audience === key ? "text-current" : "text-gray-400")}>
                    {count}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="lg:text-right">
            <p className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">Status</p>
            <div className="mt-2 flex flex-wrap gap-2 lg:justify-end">
              {STATUS_FILTERS.map((item) => {
                const active = status === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setStatus(item.key)}
                    className={cn(
                      "inline-flex h-9 items-center rounded-xl border px-3 font-saveful-semibold text-sm transition",
                      active
                        ? "border-saveful-green bg-saveful-green text-white"
                        : "border-black/[0.06] bg-[#F7F6F2] text-gray-600 hover:border-saveful-green/20 hover:bg-white",
                    )}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {error ? <p className="rounded-xl bg-amber-50 px-4 py-3 font-saveful text-sm text-amber-800">{error}</p> : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E8E2D6] border-t-saveful-green" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-black/[0.05] bg-white px-4 py-12 text-center">
          <p className="font-saveful-semibold text-sm text-gray-900">
            {rows.length === 0 ? "No listings yet." : "No listings match these filters."}
          </p>
          {rows.length === 0 ? (
            <Link href="/business/listings/new" className="mt-3 inline-block font-saveful-semibold text-sm text-saveful-green">
              List surplus food
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((listing) => (
            <ListingCard
              key={listing.id}
              listing={listing}
              cancelling={cancellingId === listing.id}
              onViewItems={() => void openItems(listing)}
              onCancel={
                isListingActive(listing)
                  ? () => {
                      if (!window.confirm("Are you sure you want to cancel this listing? This cannot be undone.")) return;
                      setCancellingId(listing.id);
                      void cancelBusinessListing(listing.id)
                        .then(() => {
                          setRows((prev) =>
                            prev.map((row) => (row.id === listing.id ? { ...row, status: "CANCELLED" } : row)),
                          );
                          void load({ silent: true });
                        })
                        .catch((err) => setError(err instanceof Error ? err.message : "Could not cancel listing."))
                        .finally(() => setCancellingId(null));
                    }
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {itemsOpen ? (
        <ListingItemsModal
          listing={itemsOpen}
          items={detailItems ?? itemsOpen.foodItems ?? []}
          loading={detailLoading}
          onClose={() => setItemsOpen(null)}
        />
      ) : null}
    </PortalPageShell>
  );
}
