"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, ChevronRight, X } from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { LISTING_ICONS, ListingIcon } from "@/components/business/ListingIcon";
import { PortalPageShell } from "@/components/ui/Portal";
import type { ApiFoodListing } from "@/lib/api";
import { listBusinessListings } from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import {
  estimateMealsSaved,
  getCollectedClaimKg,
  getListingAudience,
  getListingStatusLabel,
  getTotalKg,
  isAnimalListing,
  isListingCancelled,
  isListingCollected,
  isListingExpired,
  isPeopleListing,
  listingsFromPayload,
  resolveListingStatus,
} from "@/lib/businessListings";
import { cn } from "@/lib/utils";

/** Saveful for Business kale — lighter than the website forest green. */
const APP_GREEN = {
  text: "text-[#3A7E52]",
  border: "border-[#3A7E52]/30",
  chip: "border-[#3A7E52]/40 bg-[#E8F6EC] text-[#3A7E52]",
  badge: "bg-[#D8EBDF] text-[#3A7E52]",
  link: "inline-flex items-center gap-1 font-saveful-semibold text-sm text-[#3A7E52] transition hover:text-[#40925B]",
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_INDEX = new Date().getMonth();

type AudienceFilter = "all" | "people" | "animals";
type StatusFilter = "all" | "completed" | "cancelled";
type CardTheme = "people" | "animal" | "cancelled";

function monthsForYear(year: string) {
  if (year !== "All" && Number(year) === CURRENT_YEAR) {
    return ["All", ...MONTHS.slice(0, CURRENT_MONTH_INDEX + 1)];
  }
  return ["All", ...MONTHS];
}

function listingFilterDate(listing: ApiFoodListing) {
  const raw = listing.collectedAt || listing.pickupFromTime || listing.createdAt;
  const date = raw ? new Date(raw) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return date;
}

function isCompletedListing(listing: ApiFoodListing) {
  return isListingCollected(listing);
}

function getCardTheme(listing: ApiFoodListing): CardTheme {
  const status = resolveListingStatus(listing);
  if (status === "CANCELLED" || status === "EXPIRED") return "cancelled";
  return getListingAudience(listing) === "animal" ? "animal" : "people";
}

function historyStatusTone(listing: ApiFoodListing) {
  const status = resolveListingStatus(listing);
  if (status === "EXPIRED") return "bg-[#FFF1D6] text-amber-700";
  if (status === "COLLECTED") return "bg-[#EEF7F2] text-[#3A7E52]";
  if (status === "CLAIMED") return "bg-[#E8F1FB] text-[#2F6FED]";
  if (status === "PARTIAL") return "bg-[#FFF8E1] text-[#B8860B]";
  if (status === "CANCELLED") return "bg-gray-100 text-gray-600";
  if (getListingAudience(listing) === "animal") return "bg-[#FFE8CC] text-orange-700";
  return APP_GREEN.badge;
}

function formatShortDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()}`;
}

function formatShortTime(value?: string | null) {
  if (!value) return "";
  return new Date(value)
    .toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true })
    .replace(" ", "")
    .toLowerCase();
}

function collectedClaim(listing: ApiFoodListing) {
  return (listing.foodClaims ?? []).find((claim) => String(claim.status || "").toUpperCase() === "COLLECTED");
}

function getCollectedDate(listing: ApiFoodListing) {
  const claim = collectedClaim(listing);
  return formatShortDate(
    claim?.collectedAt || listing.collectedAt || listing.updatedAt || listing.pickupFromTime || listing.createdAt,
  );
}

function getCollectedTime(listing: ApiFoodListing) {
  const claim = collectedClaim(listing);
  return formatShortTime(
    claim?.collectedAt || listing.collectedAt || listing.updatedAt || listing.pickupFromTime || listing.createdAt,
  );
}

function getCollectorLabel(listing: ApiFoodListing) {
  if (isListingExpired(listing) || isListingCancelled(listing) || !isCompletedListing(listing)) return null;
  const claims = listing.foodClaims ?? [];
  const preferred = collectedClaim(listing) || claims[0];
  const extra = preferred as typeof preferred & {
    charityName?: string;
    farmName?: string;
    claimerName?: string;
    organisation?: { name?: string };
  };
  const name =
    extra?.claimantOrg?.name ||
    extra?.charityName ||
    extra?.farmName ||
    extra?.claimerName ||
    extra?.organisation?.name ||
    null;
  return name?.trim() ? `Collected by ${name.trim()}` : null;
}

function claimedQty(item: { totalQtyKg?: number; remainingQtyKg?: number; claimed?: number; qty?: number }) {
  if ("claimed" in item && item.claimed != null) return Number(item.claimed);
  if ("qty" in item && item.qty != null && item.remainingQtyKg == null) return Number(item.qty);
  return Math.max(0, Number(item.totalQtyKg || 0) - Number(item.remainingQtyKg ?? item.totalQtyKg ?? 0));
}

export default function BusinessListingHistoryPage() {
  return (
    <BusinessGate>
      <HistoryInner />
    </BusinessGate>
  );
}

function HistoryInner() {
  const user = useBusinessSession();
  const farm = user?.role === "farm_business";
  const [rows, setRows] = useState<ApiFoodListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState("All");
  const [month, setMonth] = useState("All");
  const [audience, setAudience] = useState<AudienceFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [details, setDetails] = useState<ApiFoodListing | null>(null);
  const [impactOpen, setImpactOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    void listBusinessListings(user.organisationId)
      .then((payload) => setRows(listingsFromPayload(payload)))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [user]);

  const years = useMemo(() => {
    const unique = [
      ...new Set(rows.map((row) => new Date(row.createdAt ?? 0).getFullYear()).filter((value) => Number.isFinite(value))),
    ].sort((a, b) => b - a);
    return ["All", ...unique.map(String)];
  }, [rows]);

  const months = monthsForYear(year);
  const peopleCount = rows.filter((row) => isPeopleListing(row)).length;
  const animalCount = rows.filter((row) => isAnimalListing(row)).length;

  const totals = useMemo(() => {
    const completed = rows.filter((row) => isCompletedListing(row));
    const totalKg = completed.reduce((sum, row) => sum + getCollectedClaimKg(row), 0);
    const peopleKg = completed
      .filter((row) => isPeopleListing(row))
      .reduce((sum, row) => sum + getCollectedClaimKg(row), 0);
    return {
      redistributedKg: Math.round(totalKg),
      mealsCreated: estimateMealsSaved(peopleKg),
      collectionsCompleted: completed.length,
      co2Avoided: Math.round(totalKg * 2.5),
    };
  }, [rows]);

  const filtered = useMemo(() => {
    return rows
      .filter((row) => {
        const date = listingFilterDate(row);
        const yearMatch = year === "All" || (date != null && String(date.getFullYear()) === year);
        const monthMatch = month === "All" || (date != null && MONTHS[date.getMonth()] === month);
        const audienceMatch =
          farm ||
          audience === "all" ||
          (audience === "people" && isPeopleListing(row)) ||
          (audience === "animals" && isAnimalListing(row));
        const statusMatch =
          status === "all" ||
          (status === "completed" && isCompletedListing(row)) ||
          (status === "cancelled" && (isListingCancelled(row) || isListingExpired(row)));
        return yearMatch && monthMatch && audienceMatch && statusMatch;
      })
      .sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());
  }, [audience, farm, month, rows, status, year]);

  return (
    <PortalPageShell className="!space-y-3 sm:!space-y-3">
      <div>
        <Link href="/business/listings" className={cn("font-saveful-semibold text-xs", APP_GREEN.text)}>
          ← Listings
        </Link>
        <h1 className="mt-1 font-saveful-bold text-2xl text-gray-900">Collection History</h1>
      </div>

      <section className={cn("rounded-2xl border bg-white p-4", APP_GREEN.border)}>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-saveful-bold text-sm text-gray-900">{farm ? "Total collections" : "Total collections"}</h2>
          <button type="button" onClick={() => setImpactOpen(true)} className={APP_GREEN.link}>
            Impact details
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {farm ? (
            <>
              <StatMini icon={LISTING_ICONS.boxed} value={`${totals.redistributedKg.toLocaleString()} kg`} label="Feed Collected" />
              <StatMini icon={LISTING_ICONS.impact} value={`${totals.co2Avoided.toLocaleString()} kg`} label="CO2 avoided" />
            </>
          ) : (
            <>
              <StatMini icon={LISTING_ICONS.items} value={`${totals.redistributedKg.toLocaleString()} kg`} label="Redistributed" />
              <StatMini icon={LISTING_ICONS.meals} value={totals.mealsCreated.toLocaleString()} label="Meals created" />
            </>
          )}
          <StatMini icon={LISTING_ICONS.collections} value={totals.collectionsCompleted.toLocaleString()} label="Collections completed" />
        </div>
      </section>

      <h2 className="font-saveful-bold text-sm text-gray-900">Search Collections</h2>
      <section className={cn("space-y-3 rounded-2xl border bg-white p-4", APP_GREEN.border)}>
        {farm ? (
          <div className="flex flex-wrap gap-2">
            <StatusChip label="All" active={status === "all"} onClick={() => setStatus("all")} />
            <StatusChip
              label="Completed"
              icon="check"
              active={status === "completed"}
              onClick={() => setStatus("completed")}
            />
            <StatusChip
              label="Cancelled"
              icon="close"
              active={status === "cancelled"}
              onClick={() => setStatus("cancelled")}
            />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <AudienceChip label={`All (${rows.length})`} active={audience === "all"} onClick={() => setAudience("all")} />
              <AudienceChip
                label={`For People (${peopleCount})`}
                icon={LISTING_ICONS.people}
                active={audience === "people"}
                onClick={() => setAudience("people")}
              />
              <AudienceChip
                label={`For Animals (${animalCount})`}
                icon={LISTING_ICONS.animals}
                active={audience === "animals"}
                onClick={() => setAudience("animals")}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatusChip
                label="Completed"
                icon="check"
                active={status === "completed"}
                onClick={() => setStatus(status === "completed" ? "all" : "completed")}
              />
              <StatusChip
                label="Cancelled"
                icon="close"
                active={status === "cancelled"}
                onClick={() => setStatus(status === "cancelled" ? "all" : "cancelled")}
              />
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          <FilterSelect
            label="Year"
            value={year}
            options={years}
            onChange={(next) => {
              setYear(next);
              setMonth("All");
            }}
          />
          <FilterSelect label="Month" value={month} options={months} onChange={setMonth} />
        </div>
      </section>

      <h2 className="font-saveful-bold text-sm text-gray-900">Recent Collections</h2>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E8E2D6] border-t-[#3A7E52]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="px-4 py-10 text-center font-saveful text-sm text-gray-500">No collections found</p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((row) => (
            <CollectionCard key={row.id} listing={row} farm={farm} onView={() => setDetails(row)} />
          ))}
        </div>
      )}

      {details ? (
        <Modal title="Listed Food" onClose={() => setDetails(null)}>
          <div className="flex border-b border-gray-200 pb-2 font-saveful-bold text-sm text-gray-900">
            <span className="flex-[2]">Item Name</span>
            <span className="flex-1 text-center">Available</span>
            {details.status !== "ACTIVE" ? <span className="flex-1 text-center">Claimed</span> : null}
          </div>
          {(details.foodItems ?? []).map((item, index) => (
            <div key={`${item.id}-${index}`} className="flex py-1.5 font-saveful text-sm text-gray-700">
              <span className="flex-[2]">{item.category || item.name}</span>
              <span className="flex-1 text-center">{item.totalQtyKg}kg</span>
              {details.status !== "ACTIVE" ? (
                <span className="flex-1 text-center">{claimedQty(item)}kg</span>
              ) : null}
            </div>
          ))}
        </Modal>
      ) : null}

      {impactOpen ? (
        <Modal title="Impact Details" onClose={() => setImpactOpen(false)}>
          {farm ? (
            <>
              <p className="font-saveful text-sm text-gray-600">{totals.redistributedKg.toLocaleString()} kg food recovered</p>
              <p className="font-saveful text-sm text-gray-600">{totals.co2Avoided.toLocaleString()} kg CO₂ avoided</p>
              <p className="font-saveful text-sm text-gray-600">{totals.collectionsCompleted.toLocaleString()} collections completed</p>
            </>
          ) : (
            <>
              <p className="font-saveful text-sm text-gray-600">{totals.redistributedKg.toLocaleString()} kg redistributed</p>
              <p className="font-saveful text-sm text-gray-600">{totals.mealsCreated.toLocaleString()} meals created</p>
              <p className="font-saveful text-sm text-gray-600">{totals.collectionsCompleted.toLocaleString()} collections completed</p>
            </>
          )}
        </Modal>
      ) : null}
    </PortalPageShell>
  );
}

function CollectionCard({
  listing,
  farm,
  onView,
}: {
  listing: ApiFoodListing;
  farm?: boolean;
  onView: () => void;
}) {
  const theme = getCardTheme(listing);
  const cancelled = theme === "cancelled";
  const expired = isListingExpired(listing);
  const completed = isCompletedListing(listing);
  const animal = theme === "animal";
  const totalKg = completed && !farm ? getCollectedClaimKg(listing) : getTotalKg(listing);
  const meals = estimateMealsSaved(totalKg);
  const co2 = Math.round(totalKg * (farm ? 2.5 : 4));
  const collectedDate = getCollectedDate(listing);
  const collectedTime = getCollectedTime(listing);
  const collectedInline = collectedTime ? `${collectedDate} • ${collectedTime}` : collectedDate;
  const statusLabel = getListingStatusLabel(listing);
  const collectorLabel = farm ? null : getCollectorLabel(listing);
  const green = theme === "people";
  const orange = theme === "animal";

  return (
    <article
      className={cn(
        "space-y-2.5 rounded-xl border bg-white p-3.5 transition hover:bg-[#F7F6F2]/70",
        green && APP_GREEN.border,
        orange && "border-[#F7931E]",
        cancelled && "border-gray-200",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={cn("rounded-full px-2.5 py-0.5 font-saveful-semibold text-[11px]", historyStatusTone(listing))}>
            {statusLabel}
          </span>
          {!cancelled && !farm ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-0.5 font-saveful-bold text-xs",
                green ? `border-[#3A7E52]/40 ${APP_GREEN.text}` : "border-[#F7931E] text-[#F7931E]",
              )}
            >
              <ListingIcon src={animal ? LISTING_ICONS.animals : LISTING_ICONS.people} className="h-4 w-4" />
              {animal ? "For Animals" : "For People"}
            </span>
          ) : null}
        </div>
        <div className="flex min-w-0 shrink-0 items-center gap-3">
          {collectorLabel ? (
            <p className="hidden min-w-0 truncate text-right font-saveful text-xs text-gray-500 sm:block">
              {collectorLabel}
            </p>
          ) : null}
          <button type="button" onClick={onView} className={APP_GREEN.link}>
            Details
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {cancelled || (!completed && !farm) ? (
        <div className="grid grid-cols-2 gap-1.5">
          <MetaBox
            theme={theme}
            icon={LISTING_ICONS.clock}
            label="Date"
            value={formatShortDate(listing.pickupFromTime || listing.createdAt)}
          />
          <MetaBox theme={theme} icon={LISTING_ICONS.items} label="Food Amount" value={`${Math.round(totalKg)} kg`} />
        </div>
      ) : (
        <div className="space-y-1.5">
          <MetaBox
            theme={theme}
            icon={LISTING_ICONS.clock}
            label="Collected"
            value={farm ? collectedDate : collectedInline}
            extra={farm ? collectedTime : undefined}
          />
          <div className="grid grid-cols-2 gap-1.5">
            <MetaBox
              theme={theme}
              icon={animal || farm ? LISTING_ICONS.boxed : LISTING_ICONS.items}
              label={animal && !farm ? "Avoid landfill" : farm ? "Food saved" : "Food saved"}
              value={`${Math.round(totalKg)} kg`}
            />
            <MetaBox
              theme={theme}
              icon={animal || farm ? LISTING_ICONS.impactOrange : LISTING_ICONS.meals}
              label={animal && !farm ? "CO2 avoided" : farm ? "C02 Avoided" : "Meals Created"}
              value={animal || farm ? `${co2} kg` : String(meals)}
            />
          </div>
        </div>
      )}

    </article>
  );
}

function MetaBox({
  theme,
  icon,
  label,
  value,
  extra,
}: {
  theme: CardTheme;
  icon: string;
  label: string;
  value: string;
  extra?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg border border-[#D9D9D9] bg-white px-2 py-1.5">
      <span
        className={cn(
          "flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full",
          theme === "animal" && "bg-[#FFE8CC]",
          theme === "cancelled" && "bg-[#F2F2F2]",
        )}
      >
        <ListingIcon src={icon} className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate font-saveful-bold text-xs text-gray-900">{label}</p>
        <p className="truncate font-saveful-bold text-xs text-gray-500">{value}</p>
        {extra ? <p className="truncate font-saveful text-xs text-gray-500">{extra}</p> : null}
      </div>
    </div>
  );
}

function StatMini({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-[#D9D9D9] bg-white px-1 py-1.5 text-center">
      <ListingIcon src={icon} className="h-7 w-7" />
      <p className={cn("w-full truncate font-saveful-bold text-sm", APP_GREEN.text)}>{value}</p>
      <p className="font-saveful-bold text-[12px] leading-tight text-gray-500">{label}</p>
    </div>
  );
}

function AudienceChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-lg border px-2 py-1.5 font-saveful-bold text-sm",
        active ? APP_GREEN.chip : "border-[#D9D9D9] bg-[#F2F2F2] text-gray-600",
      )}
    >
      {icon ? <ListingIcon src={icon} className="h-4 w-4" /> : null}
      {label}
    </button>
  );
}

function StatusChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon?: "check" | "close";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center justify-center gap-1 rounded-lg border px-2 font-saveful-bold text-[13px]",
        active ? APP_GREEN.chip : "border-[#D9D9D9] bg-[#F2F2F2] text-gray-600",
      )}
    >
      {icon === "check" ? <Check className="h-3.5 w-3.5" /> : null}
      {icon === "close" ? <X className="h-3.5 w-3.5" /> : null}
      {label}
    </button>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <div ref={ref} className="relative block">
      <p className="mb-1 font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-black/[0.08] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-900"
      >
        {value}
        <ChevronDown className={cn("h-4 w-4 text-gray-500 transition", open && "rotate-180")} />
      </button>
      {open ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-black/[0.06] bg-white p-1 shadow-lg">
          {options.map((item) => (
            <li key={item}>
              <button
                type="button"
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center rounded-lg px-3 py-2 text-left font-saveful text-sm",
                  item === value ? "bg-[#E8F6EC] text-[#3A7E52]" : "text-gray-700 hover:bg-[#F7F6F2]",
                )}
              >
                {item}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-5" onClick={onClose}>
      <div className="absolute inset-0 bg-black/35" />
      <div
        className="relative w-full max-w-[420px] space-y-2.5 rounded-2xl bg-white p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-saveful-bold text-lg text-gray-900">{title}</h2>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#dadbdd]">
            <X className="h-4 w-4 text-gray-900" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
