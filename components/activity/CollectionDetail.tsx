"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Check,
  CircleDollarSign,
  Cloud,
  Info,
  Leaf,
  Users,
  Utensils,
} from "lucide-react";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import {
  OPEN_COLLECTION_STATUSES,
  cancelCollection,
  collectionInScope,
  collectionJourney,
  collectionStatusLabel,
  collectionsForListing,
  getCollection,
  getListing,
  listingOrgLabel,
  listingRemainingKg,
  listingStatusLabel,
  useActivityVersion,
} from "@/lib/activity";
import { useSession } from "@/lib/auth";
import { formatCompactDateTime, formatCompactTime, formatDisplayDate, formatDisplayDateTime, formatTimeRange } from "@/lib/dates";
import { calculateImpact, formatCount, formatKg, formatMoney } from "@/lib/impact";
import { PATHWAY_LABEL } from "@/lib/networkQuery";
import { roleHas } from "@/lib/permissions";
import { scopeFromUser } from "@/lib/scope";
import type { ActivityCollectionStatus, ActivityListingStatus, RecoveryPathway } from "@/types/enterprise";
import { cn } from "@/lib/utils";

export function CollectionDetail({ id }: { id: string }) {
  useActivityVersion();
  const user = useSession();
  const collection = getCollection(id);
  const listing = collection ? getListing(collection.listingId) : null;
  const siblings = collection ? collectionsForListing(collection.listingId) : [];
  const scope = scopeFromUser(user);
  const allowed = Boolean(collection && collectionInScope(collection, scope));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState("");

  if (!collection || !allowed) {
    return (
      <PortalShell>
        <PortalPageShell className="!space-y-3 sm:!space-y-3">
          <nav className="font-saveful text-xs text-gray-500">
            <Link href="/activity?tab=collections" className="hover:text-saveful-green">
              Activity
            </Link>
            <span className="px-1.5 text-gray-300">/</span>
            <span className="text-gray-700">Not found</span>
          </nav>
          <section className="rounded-2xl border border-black/[0.05] bg-white p-5">
            <p className="font-saveful text-sm text-gray-600">This collection is outside your scope or does not exist.</p>
          </section>
        </PortalPageShell>
      </PortalShell>
    );
  }

  const completed = collection.status === "completed";
  const impactKg = completed ? collection.quantityKg : 0;
  const impact = calculateImpact(impactKg);
  const journey = collectionJourney(collection);
  const canCancel = roleHas(user, "createListings") && OPEN_COLLECTION_STATUSES.includes(collection.status);
  const remainingKg = listing ? listingRemainingKg(listing, siblings) : 0;
  const partial = Boolean(listing && listing.quantityKg !== collection.quantityKg);
  const measures = impactMeasures(collection.pathway, impact, completed);

  const onCancel = () => {
    const result = cancelCollection(collection.id);
    setConfirmCancel(false);
    setNotice(result.ok ? "Collection cancelled. The listing quantity remains available." : result.error);
  };

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href="/activity?tab=collections" className="hover:text-saveful-green">
            Activity
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <Link href="/activity?tab=collections" className="hover:text-saveful-green">
            Collections
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">#{collection.code}</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
                  Collection #{collection.code}
                </h1>
                <CollectionStatusPill status={collection.status} />
              </div>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                {collection.food} · {formatKg(collection.quantityKg)} in this collection
                {listing && listing.quantityKg !== collection.quantityKg ? ` · ${formatKg(listing.quantityKg)} originally listed` : ""}
              </p>
            </div>
            {canCancel ? (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Cancel collection
              </button>
            ) : null}
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            {notice ? <p className="font-saveful text-sm text-saveful-green">{notice}</p> : null}

            <section className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-[#F7F6F2] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-saveful-semibold text-sm text-gray-900">{collection.siteName}</p>
                  <p className="mt-0.5 truncate font-saveful text-xs text-gray-500">{listingOrgLabel(collection)}</p>
                </div>
              </div>
              {roleHas(user, "viewSites") ? (
                <Link
                  href={`/sites/${collection.siteId}`}
                  className="inline-flex h-9 shrink-0 items-center rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-white/80"
                >
                  View site
                </Link>
              ) : null}
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
              <div className="space-y-4">
                <WorkspaceSection title="Collection details">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-3.5 sm:grid-cols-2">
                    <Detail label="Food" value={collection.food} />
                    <Detail label="Category" value={listing?.category ?? "Surplus food"} />
                    <Detail label="Quantity collected" value={formatKg(collection.quantityKg)} />
                    <Detail label="Collection date" value={formatDisplayDate(collection.occurredAt.slice(0, 10))} />
                    <Detail label="Collection time" value={formatCompactTime(collection.occurredAt)} />
                    <Detail
                      label="Collection window"
                      value={listing ? formatTimeRange(listing.pickupFrom, listing.pickupTo) : "—"}
                    />
                  </dl>
                  {partial && listing ? (
                    <div className="grid grid-cols-1 gap-3 border-t border-gray-100 px-3.5 py-3 sm:grid-cols-3">
                      <Detail label="Original quantity listed" value={formatKg(listing.quantityKg)} />
                      <Detail label="Quantity in this collection" value={formatKg(collection.quantityKg)} />
                      <Detail label="Remaining quantity" value={formatKg(remainingKg)} />
                    </div>
                  ) : null}
                </WorkspaceSection>

                <WorkspaceSection title="Collection journey">
                  <ol className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-4">
                    {journey.map((step) => (
                      <li key={step.id} className="min-w-0">
                        <span
                          className={cn(
                            "flex h-7 w-7 items-center justify-center rounded-full",
                            step.reached ? "bg-saveful-green text-white" : "bg-gray-100 text-gray-400",
                          )}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </span>
                        <p className="mt-2 font-saveful-semibold text-sm text-gray-900">{step.label}</p>
                        <p className="mt-0.5 font-saveful text-[11px] text-gray-500">
                          {step.reached && step.at ? formatCompactDateTime(step.at) : "—"}
                        </p>
                      </li>
                    ))}
                  </ol>
                </WorkspaceSection>

                <WorkspaceSection
                  title="Impact"
                  hint={completed ? "From this completed collection" : "Available after this collection is completed"}
                >
                  <div className={cn("grid gap-px bg-gray-100", measures.length === 4 ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-2 sm:grid-cols-3")}>
                    {measures.map((item) => (
                      <ImpactCell key={item.label} icon={item.icon} label={item.label} value={item.value} hint={item.hint} />
                    ))}
                  </div>
                </WorkspaceSection>

                {listing ? (
                  <WorkspaceSection title="Related listing">
                    <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <Link
                          href={`/activity/listings/${listing.id}`}
                          className="font-saveful-semibold text-sm text-saveful-green hover:underline"
                        >
                          Listing #{listing.code}
                        </Link>
                        <p className="mt-1.5 font-saveful text-xs text-gray-500">
                          Originally listed: {formatKg(listing.quantityKg)}
                          <span className="text-gray-300"> · </span>
                          This collection: {formatKg(collection.quantityKg)}
                          {partial ? (
                            <>
                              <span className="text-gray-300"> · </span>
                              Remaining: {formatKg(remainingKg)}
                            </>
                          ) : null}
                        </p>
                        <div className="mt-2">
                          <ListingStatusPill status={listing.status} />
                        </div>
                      </div>
                      <Link
                        href={`/activity/listings/${listing.id}`}
                        className="inline-flex h-9 shrink-0 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
                      >
                        View listing
                      </Link>
                    </div>
                  </WorkspaceSection>
                ) : null}
              </div>

              <div className="space-y-4">
                <WorkspaceSection title="Recovery pathway">
                  <div className="space-y-3 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
                        <Users className="h-4 w-4" />
                      </span>
                      <p className="font-saveful-semibold text-sm text-gray-900">{PATHWAY_LABEL[collection.pathway]}</p>
                    </div>
                    <Detail label="Collected by" value={collection.recipientName} />
                    <Detail label="Driver" value={collection.driverName ?? "Not assigned"} />
                    <Detail label="Collection confirmed by" value={collection.confirmedBy ?? "—"} />
                  </div>
                </WorkspaceSection>

                <WorkspaceSection title="Handover details">
                  <dl className="space-y-3 p-3.5">
                    <Detail label="Collection reference" value={collection.code} />
                    <Detail label="Collected by" value={collection.recipientName} />
                    <Detail label="Driver" value={collection.driverName ?? "Not assigned"} />
                    <Detail label="Confirmed by" value={collection.confirmedBy ?? "—"} />
                    <Detail
                      label="Completed"
                      value={completed ? formatDisplayDateTime(plusCompleted(collection.occurredAt)) : "—"}
                    />
                  </dl>
                </WorkspaceSection>

                {collection.notes ? (
                  <WorkspaceSection title="Notes">
                    <p className="p-3.5 font-saveful text-sm leading-relaxed text-gray-700">
                      <span className="block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">Collection notes</span>
                      <span className="mt-1 block">{collection.notes}</span>
                    </p>
                  </WorkspaceSection>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/activity?tab=collections"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Activity
              </Link>
              <p className="flex items-start gap-2 font-saveful text-xs text-gray-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
                You can see this collection because it falls within your assigned scope. Group, territory and cluster are
                the classification that applied when the transaction occurred.
              </p>
            </div>
          </div>
        </section>
      </PortalPageShell>

      {confirmCancel ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={() => setConfirmCancel(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="font-saveful-bold text-lg text-gray-900">Cancel this collection?</h2>
            <p className="mt-2 font-saveful text-sm text-gray-600">
              This collection will no longer proceed. Quantity on the originating listing stays available.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Keep collection
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
              >
                Cancel collection
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

function plusCompleted(iso: string) {
  return new Date(new Date(iso).getTime() + 6 * 60_000).toISOString();
}

function impactMeasures(pathway: RecoveryPathway, impact: ReturnType<typeof calculateImpact>, completed: boolean) {
  const recovered =
    pathway === "people"
      ? "Food recovered"
      : pathway === "livestock"
        ? "Diverted to feed"
        : pathway === "circular"
          ? "Material recovered"
          : "Organic recovered";
  const items = [
    { icon: Leaf, label: recovered, value: formatKg(impact.foodKg) },
    pathway === "people"
      ? { icon: Utensils, label: "Meals created", value: formatCount(impact.mealsCreated) }
      : null,
    { icon: Cloud, label: "CO₂ avoided", value: formatKg(impact.co2AvoidedKg) },
    pathway === "people"
      ? {
          icon: CircleDollarSign,
          label: "Estimated food value",
          value: formatMoney(impact.foodValue),
          hint: completed ? "Based on completed quantity in this collection" : undefined,
        }
      : null,
  ];
  return items.filter((item): item is NonNullable<typeof item> => Boolean(item));
}

function Detail({ label, value }: { label: string; value: string | number | ReactNode }) {
  return (
    <div>
      <dt className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">{label}</dt>
      <dd className="mt-1 font-saveful text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function ImpactCell({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Leaf;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="bg-white px-3 py-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saveful-green/10 text-saveful-green">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="mt-2 font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1.5 font-saveful text-[11px] text-gray-500">
        {label}
        {hint ? (
          <span className="ml-1 inline-flex align-middle text-gray-400" title={hint}>
            <Info className="h-3 w-3" />
          </span>
        ) : null}
      </p>
    </div>
  );
}

function WorkspaceSection({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
        <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
        {hint ? <span className="truncate font-saveful text-[11px] text-gray-400">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function CollectionStatusPill({ status }: { status: ActivityCollectionStatus }) {
  const tone =
    status === "completed"
      ? "bg-saveful-green text-white"
      : status === "in_progress"
        ? "bg-blue-50 text-blue-700"
        : status === "scheduled"
          ? "bg-amber-50 text-amber-700"
          : "bg-gray-100 text-gray-600";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-saveful text-[11px]", tone)}>
      {status === "completed" ? <Check className="h-3 w-3" /> : null}
      {collectionStatusLabel(status)}
    </span>
  );
}

function ListingStatusPill({ status }: { status: ActivityListingStatus }) {
  const tone =
    status === "completed" || status === "collected"
      ? "bg-saveful-green/10 text-saveful-green"
      : status === "published"
        ? "bg-blue-50 text-blue-700"
        : status === "claimed" || status === "driver_assigned"
          ? "bg-amber-50 text-amber-700"
          : "bg-gray-100 text-gray-600";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 font-saveful text-[11px]", tone)}>{listingStatusLabel(status)}</span>;
}
