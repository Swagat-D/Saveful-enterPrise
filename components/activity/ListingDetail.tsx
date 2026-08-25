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
  OPEN_LISTING_STATUSES,
  cancelListing,
  collectionStatusLabel,
  collectionsForListing,
  getListing,
  listingCollectedKg,
  listingImpactKg,
  listingInScope,
  listingJourney,
  listingOrgLabel,
  listingStatusLabel,
  useActivityVersion,
} from "@/lib/activity";
import { useSession } from "@/lib/auth";
import { formatCompactDateTime, formatDisplayDateTime, formatTimeRange } from "@/lib/dates";
import { calculateImpact, formatCount, formatKg, formatMoney } from "@/lib/impact";
import { PATHWAY_LABEL } from "@/lib/networkQuery";
import { roleHas } from "@/lib/permissions";
import { scopeFromUser } from "@/lib/scope";
import type { ActivityCollection, ActivityCollectionStatus, ActivityListingStatus } from "@/types/enterprise";
import { cn } from "@/lib/utils";

export function ListingDetail({ id }: { id: string }) {
  useActivityVersion();
  const user = useSession();
  const listing = getListing(id);
  const collections = collectionsForListing(id);
  const scope = scopeFromUser(user);
  const allowed = Boolean(listing && listingInScope(listing, scope));
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [notice, setNotice] = useState("");

  if (!listing || !allowed) {
    return (
      <PortalShell>
        <PortalPageShell className="!space-y-3 sm:!space-y-3">
          <nav className="font-saveful text-xs text-gray-500">
            <Link href="/activity" className="hover:text-saveful-green">
              Activity
            </Link>
            <span className="px-1.5 text-gray-300">/</span>
            <span className="text-gray-700">Not found</span>
          </nav>
          <section className="rounded-2xl border border-black/[0.05] bg-white p-5">
            <p className="font-saveful text-sm text-gray-600">This listing is outside your scope or does not exist.</p>
          </section>
        </PortalPageShell>
      </PortalShell>
    );
  }

  const collectedKg = listingCollectedKg(listing, collections);
  const impactKg = listingImpactKg(collections);
  const impact = calculateImpact(impactKg);
  const journey = listingJourney(listing, collections);
  const canOperate = roleHas(user, "createListings");
  const canCancel = canOperate && OPEN_LISTING_STATUSES.includes(listing.status);
  const completedCollections = collections.filter((row) => row.status === "completed");
  const pathwayCollection = completedCollections[0] ?? collections[0] ?? null;

  const onCancel = () => {
    const result = cancelListing(listing.id);
    setConfirmCancel(false);
    setNotice(result.ok ? "Listing cancelled. Historical collections are unchanged." : result.error);
  };

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href="/activity" className="hover:text-saveful-green">
            Activity
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <Link href="/activity" className="hover:text-saveful-green">
            Listings
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">#{listing.code}</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">Listing #{listing.code}</h1>
                <ListingStatusPill status={listing.status} />
              </div>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                {listing.food} · {formatKg(listing.quantityKg)} listed
                {listing.claimedKg > 0 && listing.claimedKg < listing.quantityKg ? ` · ${formatKg(listing.claimedKg)} claimed` : ""}
              </p>
            </div>
            {canCancel ? (
              <button
                type="button"
                onClick={() => setConfirmCancel(true)}
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Cancel listing
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
                  <p className="font-saveful-semibold text-sm text-gray-900">{listing.siteName}</p>
                  <p className="mt-0.5 truncate font-saveful text-xs text-gray-500">{listingOrgLabel(listing)}</p>
                </div>
              </div>
              {roleHas(user, "viewSites") ? (
                <Link
                  href={`/sites/${listing.siteId}`}
                  className="inline-flex h-9 shrink-0 items-center rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-white/80"
                >
                  View site
                </Link>
              ) : null}
            </section>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(18rem,1fr)]">
              <div className="space-y-4">
                <WorkspaceSection title="Listing details">
                  <dl className="grid grid-cols-1 gap-x-6 gap-y-3 p-3.5 sm:grid-cols-2">
                    <Detail label="Food" value={listing.food} />
                    <Detail label="Category" value={listing.category} />
                    <Detail label="Quantity listed" value={formatKg(listing.quantityKg)} />
                    <Detail label="Quantity collected" value={formatKg(collectedKg)} />
                    <Detail label="Created" value={formatDisplayDateTime(listing.createdAt)} />
                    <Detail label="Collection window" value={formatTimeRange(listing.pickupFrom, listing.pickupTo)} />
                  </dl>
                  {listing.claimedKg > 0 && listing.claimedKg < listing.quantityKg ? (
                    <p className="border-t border-gray-100 px-3.5 py-2.5 font-saveful text-xs text-gray-500">
                      {formatKg(listing.claimedKg)} of {formatKg(listing.quantityKg)} has been claimed so far. Remaining quantity can still generate another collection.
                    </p>
                  ) : null}
                </WorkspaceSection>

                <WorkspaceSection title="Listing journey">
                  <ol className="grid grid-cols-1 gap-3 p-3.5 sm:grid-cols-5">
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
                  hint={impactKg > 0 ? "From completed collections" : "Available after a collection is completed"}
                >
                  <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                    <ImpactCell icon={Leaf} label="Food recovered" value={formatKg(impact.foodKg)} />
                    <ImpactCell icon={Utensils} label="Meals created" value={formatCount(impact.mealsCreated)} />
                    <ImpactCell icon={Cloud} label="CO₂ avoided" value={formatKg(impact.co2AvoidedKg)} />
                    <ImpactCell icon={CircleDollarSign} label="Estimated food value" value={formatMoney(impact.foodValue)} />
                  </div>
                </WorkspaceSection>
              </div>

              <div className="space-y-4">
                <WorkspaceSection title="Recovery pathway">
                  <div className="space-y-3 p-3.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
                        <Users className="h-4 w-4" />
                      </span>
                      <p className="font-saveful-semibold text-sm text-gray-900">{PATHWAY_LABEL[listing.pathway]}</p>
                    </div>
                    <Detail
                      label="Recipient"
                      value={
                        pathwayCollection ? (
                          <span>{pathwayCollection.recipientName}</span>
                        ) : (
                          "Not claimed yet"
                        )
                      }
                    />
                    <Detail label="Quantity received" value={formatKg(impactKg)} />
                    <Detail
                      label="Collection completed"
                      value={
                        completedCollections.length
                          ? formatDisplayDateTime(completedCollections[completedCollections.length - 1]?.occurredAt)
                          : "—"
                      }
                    />
                  </div>
                </WorkspaceSection>

                {listing.notes ? (
                  <WorkspaceSection title="Notes">
                    <p className="p-3.5 font-saveful text-sm leading-relaxed text-gray-700">{listing.notes}</p>
                  </WorkspaceSection>
                ) : null}
              </div>
            </div>

            <WorkspaceSection title="Collections" hint="A listing may have more than one collection">
              {collections.length ? (
                <>
                  <div className="hidden overflow-x-auto px-3.5 pb-2 lg:block">
                    <table className="min-w-full text-left">
                      <thead>
                        <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                          <th className="pb-2 pr-3 font-saveful">Collection ID</th>
                          <th className="pb-2 pr-3 font-saveful">Organisation</th>
                          <th className="pb-2 pr-3 font-saveful">Quantity</th>
                          <th className="pb-2 font-saveful">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {collections.map((row) => (
                          <tr key={row.id} className="border-b border-gray-50 last:border-0">
                            <td className="py-2.5 pr-3">
                              <Link
                                href={`/activity/collections/${row.id}`}
                                className="font-saveful-semibold text-sm text-saveful-green hover:underline"
                              >
                                #{row.code}
                              </Link>
                            </td>
                            <td className="py-2.5 pr-3 font-saveful text-sm text-gray-800">{row.recipientName}</td>
                            <td className="py-2.5 pr-3 font-saveful text-sm text-gray-800">{formatKg(row.quantityKg)}</td>
                            <td className="py-2.5">
                              <CollectionStatusPill status={row.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="divide-y divide-gray-100 px-3.5 lg:hidden">
                    {collections.map((row) => (
                      <CollectionRow key={row.id} row={row} />
                    ))}
                  </div>
                </>
              ) : (
                <p className="px-3.5 py-3 font-saveful text-sm text-gray-500">No collections yet for this listing.</p>
              )}
            </WorkspaceSection>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Link
                href="/activity"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to Activity
              </Link>
              <p className="flex items-start gap-2 font-saveful text-xs text-gray-500">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
                You can see this listing because it falls within your assigned scope. Group, territory and cluster are the
                classification that applied when it was created.
              </p>
            </div>
          </div>
        </section>
      </PortalPageShell>

      {confirmCancel ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/30" onClick={() => setConfirmCancel(false)} />
          <div role="dialog" aria-modal="true" className="relative w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <h2 className="font-saveful-bold text-lg text-gray-900">Cancel this listing?</h2>
            <p className="mt-2 font-saveful text-sm text-gray-600">
              The listing will no longer be available to claim. Existing collections stay in Activity as historical records.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCancel(false)}
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Keep listing
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
              >
                Cancel listing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

function CollectionRow({ row }: { row: ActivityCollection }) {
  return (
    <Link href={`/activity/collections/${row.id}`} className="block py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-saveful-semibold text-sm text-saveful-green">#{row.code}</p>
          <p className="mt-0.5 font-saveful text-xs text-gray-500">
            {row.recipientName} · {formatKg(row.quantityKg)}
          </p>
        </div>
        <CollectionStatusPill status={row.status} />
      </div>
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: string | number | ReactNode }) {
  return (
    <div>
      <dt className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">{label}</dt>
      <dd className="mt-1 font-saveful text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function ImpactCell({ icon: Icon, label, value }: { icon: typeof Leaf; label: string; value: string }) {
  return (
    <div className="bg-white px-3 py-3">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-saveful-green/10 text-saveful-green">
        <Icon className="h-3.5 w-3.5" />
      </span>
      <p className="mt-2 font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1.5 font-saveful text-[11px] text-gray-500">{label}</p>
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

function ListingStatusPill({ status }: { status: ActivityListingStatus }) {
  const tone =
    status === "completed" || status === "collected"
      ? "bg-saveful-green text-white"
      : status === "published"
        ? "bg-blue-50 text-blue-700"
        : status === "claimed" || status === "driver_assigned"
          ? "bg-amber-50 text-amber-700"
          : "bg-gray-100 text-gray-600";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-saveful text-[11px]", tone)}>
      {status === "completed" ? <Check className="h-3 w-3" /> : null}
      {listingStatusLabel(status)}
    </span>
  );
}

function CollectionStatusPill({ status }: { status: ActivityCollectionStatus }) {
  const tone =
    status === "completed"
      ? "bg-saveful-green/10 text-saveful-green"
      : status === "in_progress"
        ? "bg-blue-50 text-blue-700"
        : status === "scheduled"
          ? "bg-amber-50 text-amber-700"
          : "bg-gray-100 text-gray-600";
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 font-saveful text-[11px]", tone)}>{collectionStatusLabel(status)}</span>;
}
