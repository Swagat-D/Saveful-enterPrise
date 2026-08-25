"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronRight, Download, Plus, Search } from "lucide-react";
import { MoreFilters } from "@/components/network/FilterBar";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { useSession } from "@/lib/auth";
import { roleHas } from "@/lib/permissions";
import {
  ACTIVITY_PATHWAYS,
  COLLECTION_STATUSES,
  EMPTY_ACTIVITY_FILTERS,
  LISTING_STATUSES,
  activityFilterOptions,
  activityFiltersToQuery,
  collectionStatusLabel,
  collectionSummaryCounts,
  exportActivityCsv,
  filterActivityCollections,
  filterActivityListings,
  hasActiveActivityFilters,
  listingStatusLabel,
  listingSummaryCounts,
  parseActivityFilters,
  useActivityVersion,
  type ActivityFilters,
  type ActivityTab,
} from "@/lib/activity";
import { periodLabel } from "@/lib/dates";
import { formatKg } from "@/lib/impact";
import { PATHWAY_LABEL } from "@/lib/networkQuery";
import { formatLastActivity } from "@/lib/networkRules";
import { useOrgStructureVersion } from "@/lib/orgStructure";
import { scopeFromUser } from "@/lib/scope";
import type { ActivityCollection, ActivityCollectionStatus, ActivityListing, ActivityListingStatus, PeriodKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "7 days" },
  { id: "30", label: "30 days" },
  { id: "90", label: "90 days" },
  { id: "all", label: "All time" },
];

export function ActivityWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSession();
  const scope = scopeFromUser(user);
  const structureVersion = useOrgStructureVersion();
  const activityVersion = useActivityVersion();
  const filters = useMemo(() => parseActivityFilters(searchParams), [searchParams]);
  const options = useMemo(() => activityFilterOptions(scope), [scope, structureVersion]);
  const listingRows = useMemo(() => filterActivityListings(filters, scope), [filters, scope, structureVersion, activityVersion]);
  const collectionRows = useMemo(() => filterActivityCollections(filters, scope), [filters, scope, structureVersion, activityVersion]);
  const listingCounts = useMemo(() => listingSummaryCounts(filters, scope), [filters, scope, structureVersion, activityVersion]);
  const collectionCounts = useMemo(() => collectionSummaryCounts(filters, scope), [filters, scope, structureVersion, activityVersion]);
  const rows = filters.tab === "listings" ? listingRows : collectionRows;
  const pageCount = Math.max(1, Math.ceil(rows.length / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const paged = rows.slice((page - 1) * filters.pageSize, page * filters.pageSize);

  const setFilters = (next: ActivityFilters) => {
    router.replace(`${pathname}${activityFiltersToQuery({ ...next, page: next.page || 1 })}`, { scroll: false });
  };
  const update = (patch: Partial<ActivityFilters>) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 });
  const setTab = (tab: ActivityTab) => setFilters({ ...filters, tab, status: "all", summary: "all", q: "", page: 1 });

  const filterCount = [
    filters.period !== "30",
    filters.groupId !== "all",
    filters.territoryId !== "all",
    filters.clusterId !== "all",
    filters.siteId !== "all",
    filters.pathway !== "all",
    filters.status !== "all",
  ].filter(Boolean).length;

  const statusOptions =
    filters.tab === "listings"
      ? LISTING_STATUSES.map((item) => ({ id: item.id, name: item.label }))
      : COLLECTION_STATUSES.map((item) => ({ id: item.id, name: item.label }));

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <span className="text-gray-700">Activity</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">Activity</h1>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                View listings and collections across your organisation.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportActivityCsv(
                    filters.tab,
                    filters.tab === "listings" ? listingRows : collectionRows,
                  )
                }
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </button>
              {roleHas(user, "createListings") ? (
                <Link
                  href="/listings/new"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Create listing
                </Link>
              ) : null}
            </div>
          </header>

          <div className="flex gap-5 overflow-x-auto border-b border-gray-100 px-4 sm:px-5">
            {(
              [
                ["listings", "Listings"],
                ["collections", "Collections"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "-mb-px border-b-2 py-2.5 font-saveful-semibold text-sm whitespace-nowrap",
                  filters.tab === id
                    ? "border-saveful-green text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-800",
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <WorkspaceSection title={filters.tab === "listings" ? "Listings snapshot" : "Collections snapshot"} hint={periodLabel(filters.period)}>
              {filters.tab === "listings" ? (
                <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                  <SummaryCell label="Total listings" value={listingCounts.total} active={filters.summary === "all"} onClick={() => update({ summary: "all", status: "all" })} />
                  <SummaryCell label="Published" value={listingCounts.published} active={filters.summary === "published"} onClick={() => update({ summary: filters.summary === "published" ? "all" : "published", status: "all" })} />
                  <SummaryCell label="Claimed" value={listingCounts.claimed} active={filters.summary === "claimed"} onClick={() => update({ summary: filters.summary === "claimed" ? "all" : "claimed", status: "all" })} />
                  <SummaryCell label="Completed" value={listingCounts.completed} active={filters.summary === "completed"} onClick={() => update({ summary: filters.summary === "completed" ? "all" : "completed", status: "all" })} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                  <SummaryCell label="Total collections" value={collectionCounts.total} active={filters.summary === "all"} onClick={() => update({ summary: "all", status: "all" })} />
                  <SummaryCell label="Scheduled" value={collectionCounts.scheduled} active={filters.summary === "scheduled"} onClick={() => update({ summary: filters.summary === "scheduled" ? "all" : "scheduled", status: "all" })} />
                  <SummaryCell label="In progress" value={collectionCounts.inProgress} active={filters.summary === "in_progress"} onClick={() => update({ summary: filters.summary === "in_progress" ? "all" : "in_progress", status: "all" })} />
                  <SummaryCell label="Completed" value={collectionCounts.completed} active={filters.summary === "completed"} onClick={() => update({ summary: filters.summary === "completed" ? "all" : "completed", status: "all" })} />
                </div>
              )}
            </WorkspaceSection>

            <WorkspaceSection
              title={filters.tab === "listings" ? "Listings" : "Collections"}
              action={
                hasActiveActivityFilters(filters) ? (
                  <button
                    type="button"
                    onClick={() => setFilters({ ...EMPTY_ACTIVITY_FILTERS, tab: filters.tab })}
                    className="font-saveful-semibold text-xs text-saveful-green hover:underline"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            >
              <div className="space-y-3 p-3.5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      value={filters.q}
                      onChange={(event) => update({ q: event.target.value })}
                      placeholder={filters.tab === "listings" ? "Search listings" : "Search collections"}
                      className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] pl-8 pr-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white"
                    />
                  </label>
                  <div className="lg:hidden">
                    <MoreFilters
                      count={filterCount}
                      summary={`${periodLabel(filters.period)}${filterCount ? ` · ${filterCount} filters` : ""}`}
                      title="Filter activity"
                      subtitle="All figures, the table and export use the same filters."
                      onReset={() => setFilters({ ...EMPTY_ACTIVITY_FILTERS, tab: filters.tab })}
                    >
                      <div className="grid grid-cols-1 gap-3">
                        <FilterSelect label="Period" value={filters.period} onChange={(period) => update({ period: period as PeriodKey })} options={PERIODS} />
                        <FilterSelect label="Group" value={filters.groupId} onChange={(groupId) => update({ groupId })} options={[{ id: "all", name: "All" }, ...options.groups]} />
                        <FilterSelect label="Territory" value={filters.territoryId} onChange={(territoryId) => update({ territoryId })} options={[{ id: "all", name: "All" }, ...options.territories]} />
                        <FilterSelect label="Cluster" value={filters.clusterId} onChange={(clusterId) => update({ clusterId })} options={[{ id: "all", name: "All" }, ...options.clusters]} />
                        <FilterSelect label="Site" value={filters.siteId} onChange={(siteId) => update({ siteId })} options={[{ id: "all", name: "All" }, ...options.sites]} />
                        <FilterSelect label="Pathway" value={filters.pathway} onChange={(pathway) => update({ pathway: pathway as ActivityFilters["pathway"] })} options={[{ id: "all", name: "All" }, ...ACTIVITY_PATHWAYS]} />
                        <FilterSelect label="Status" value={filters.status} onChange={(status) => update({ status, summary: "all" })} options={[{ id: "all", name: "All" }, ...statusOptions]} />
                      </div>
                    </MoreFilters>
                  </div>
                </div>
                <div className="hidden grid-cols-2 gap-2 lg:grid xl:grid-cols-4">
                  <FilterSelect value={filters.period} onChange={(period) => update({ period: period as PeriodKey })} options={PERIODS.map((item) => ({ id: item.id, name: `Period: ${item.label}` }))} />
                  <FilterSelect value={filters.groupId} onChange={(groupId) => update({ groupId })} options={[{ id: "all", name: "Group: All" }, ...options.groups.map((item) => ({ id: item.id, name: `Group: ${item.name}` }))]} />
                  <FilterSelect value={filters.territoryId} onChange={(territoryId) => update({ territoryId })} options={[{ id: "all", name: "Territory: All" }, ...options.territories.map((item) => ({ id: item.id, name: `Territory: ${item.name}` }))]} />
                  <FilterSelect value={filters.clusterId} onChange={(clusterId) => update({ clusterId })} options={[{ id: "all", name: "Cluster: All" }, ...options.clusters.map((item) => ({ id: item.id, name: `Cluster: ${item.name}` }))]} />
                  <FilterSelect value={filters.siteId} onChange={(siteId) => update({ siteId })} options={[{ id: "all", name: "Site: All" }, ...options.sites.map((item) => ({ id: item.id, name: `Site: ${item.name}` }))]} />
                  <FilterSelect value={filters.pathway} onChange={(pathway) => update({ pathway: pathway as ActivityFilters["pathway"] })} options={[{ id: "all", name: "Pathway: All" }, ...ACTIVITY_PATHWAYS.map((item) => ({ id: item.id, name: `Pathway: ${item.label}` }))]} />
                  <FilterSelect value={filters.status} onChange={(status) => update({ status, summary: "all" })} options={[{ id: "all", name: "Status: All" }, ...statusOptions.map((item) => ({ id: item.id, name: `Status: ${item.name}` }))]} />
                </div>
              </div>

              {filters.tab === "listings" ? (
                <ListingsTable rows={paged as ActivityListing[]} />
              ) : (
                <CollectionsTable rows={paged as ActivityCollection[]} />
              )}

              {rows.length === 0 ? (
                <p className="px-3.5 pb-3.5 font-saveful text-sm text-gray-500">
                  No {filters.tab} match these filters.
                </p>
              ) : (
                <div className="flex flex-col gap-3 border-t border-gray-100 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-saveful text-xs text-gray-500">
                    Showing {(page - 1) * filters.pageSize + 1}–{Math.min(page * filters.pageSize, rows.length)} of {rows.length} {filters.tab}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 font-saveful text-xs text-gray-500">
                      Rows per page
                      <select
                        value={filters.pageSize}
                        onChange={(event) => update({ pageSize: Number(event.target.value) as 10 | 25 | 50 })}
                        className="h-8 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                    <div className="flex items-center gap-1">
                      <PageButton disabled={page <= 1} onClick={() => update({ page: page - 1 })}>‹</PageButton>
                      <span className="min-w-8 px-2 text-center font-saveful text-sm">{page}</span>
                      <PageButton disabled={page >= pageCount} onClick={() => update({ page: page + 1 })}>›</PageButton>
                    </div>
                  </div>
                </div>
              )}
            </WorkspaceSection>
          </div>
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}

function ListingsTable({ rows }: { rows: ActivityListing[] }) {
  const router = useRouter();
  return (
    <>
      <div className="hidden overflow-x-auto px-3.5 pb-2 lg:block">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
              <th className="pb-2 pr-3 font-saveful">Listing</th>
              <th className="pb-2 pr-3 font-saveful">Site</th>
              <th className="pb-2 pr-3 font-saveful">Food</th>
              <th className="pb-2 pr-3 font-saveful">Pathway</th>
              <th className="pb-2 pr-3 font-saveful">Quantity</th>
              <th className="pb-2 pr-3 font-saveful">Status</th>
              <th className="pb-2 pr-3 font-saveful">Created</th>
              <th className="pb-2 font-saveful"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]"
                onClick={() => router.push(`/activity/listings/${row.id}`)}
              >
                <td className="py-2.5 pr-3">
                  <Link href={`/activity/listings/${row.id}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                    #{row.code}
                  </Link>
                  {row.collectionIds.length > 1 ? (
                    <p className="font-saveful text-[11px] text-gray-400">{row.collectionIds.length} collections</p>
                  ) : null}
                </td>
                <td className="py-2.5 pr-3 font-saveful text-sm text-gray-800">{row.siteName}</td>
                <td className="py-2.5 pr-3 font-saveful text-sm text-gray-800">{row.food}</td>
                <td className="py-2.5 pr-3"><PathwayPill pathway={row.pathway} /></td>
                <td className="py-2.5 pr-3 font-saveful text-sm tabular-nums text-gray-800">{formatKg(row.quantityKg)}</td>
                <td className="py-2.5 pr-3"><ListingStatusPill status={row.status} /></td>
                <td className="py-2.5 pr-3 font-saveful text-sm text-gray-600">{formatLastActivity(row.createdAt)}</td>
                <td className="py-2.5 text-gray-400">
                  <ChevronRight className="h-4 w-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-gray-100 px-3.5 lg:hidden">
        {rows.map((row) => (
          <Link key={row.id} href={`/activity/listings/${row.id}`} className="block py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-saveful-semibold text-sm text-saveful-green">#{row.code}</p>
                <p className="mt-0.5 font-saveful text-xs text-gray-500">{row.siteName} · {row.food}</p>
              </div>
              <ListingStatusPill status={row.status} />
            </div>
            <p className="mt-1 font-saveful text-xs text-gray-500">
              {PATHWAY_LABEL[row.pathway]} · {formatKg(row.quantityKg)} · {formatLastActivity(row.createdAt)}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

function CollectionsTable({ rows }: { rows: ActivityCollection[] }) {
  const router = useRouter();
  return (
    <>
      <div className="hidden overflow-x-auto px-3.5 pb-2 lg:block">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
              <th className="pb-2 pr-3 font-saveful">Collection</th>
              <th className="pb-2 pr-3 font-saveful">Listing</th>
              <th className="pb-2 pr-3 font-saveful">Site</th>
              <th className="pb-2 pr-3 font-saveful">Pathway</th>
              <th className="pb-2 pr-3 font-saveful">Quantity</th>
              <th className="pb-2 pr-3 font-saveful">Status</th>
              <th className="pb-2 pr-3 font-saveful">Date</th>
              <th className="pb-2 font-saveful"> </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]"
                onClick={() => router.push(`/activity/collections/${row.id}`)}
              >
                <td className="py-2.5 pr-3">
                  <Link href={`/activity/collections/${row.id}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                    #{row.code}
                  </Link>
                  <p className="font-saveful text-[11px] text-gray-400">{row.recipientName}</p>
                </td>
                <td className="py-2.5 pr-3" onClick={(event) => event.stopPropagation()}>
                  <Link href={`/activity/listings/${row.listingId}`} className="font-saveful text-sm text-gray-800 hover:text-saveful-green">
                    #{row.listingCode}
                  </Link>
                </td>
                <td className="py-2.5 pr-3 font-saveful text-sm text-gray-800">{row.siteName}</td>
                <td className="py-2.5 pr-3"><PathwayPill pathway={row.pathway} /></td>
                <td className="py-2.5 pr-3 font-saveful text-sm tabular-nums text-gray-800">{formatKg(row.quantityKg)}</td>
                <td className="py-2.5 pr-3"><CollectionStatusPill status={row.status} /></td>
                <td className="py-2.5 pr-3 font-saveful text-sm text-gray-600">{formatLastActivity(row.occurredAt)}</td>
                <td className="py-2.5 text-gray-400">
                  <ChevronRight className="h-4 w-4" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="divide-y divide-gray-100 px-3.5 lg:hidden">
        {rows.map((row) => (
          <Link key={row.id} href={`/activity/collections/${row.id}`} className="block py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-saveful-semibold text-sm text-saveful-green">#{row.code}</p>
                <p className="mt-0.5 font-saveful text-xs text-gray-500">{row.siteName} · {row.food}</p>
              </div>
              <CollectionStatusPill status={row.status} />
            </div>
            <p className="mt-1 font-saveful text-xs text-gray-500">
              #{row.listingCode} · {formatKg(row.quantityKg)} · {formatLastActivity(row.occurredAt)}
            </p>
          </Link>
        ))}
      </div>
    </>
  );
}

function PathwayPill({ pathway }: { pathway: ActivityListing["pathway"] }) {
  const tones = {
    people: "bg-saveful-green/10 text-saveful-green",
    livestock: "bg-amber-50 text-amber-700",
    circular: "bg-teal-50 text-teal-700",
    bioenergy: "bg-slate-100 text-slate-700",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 font-saveful text-[11px]", tones[pathway])}>
      {PATHWAY_LABEL[pathway]}
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

function WorkspaceSection({ title, hint, action, children }: { title: string; hint?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
          <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
          {hint ? <span className="truncate font-saveful text-[11px] text-gray-400">{hint}</span> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryCell({ label, value, active, onClick }: { label: string; value: number; active?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("bg-white px-3 py-3 text-left transition hover:bg-[#FAF7F0]", active && "bg-saveful-green/[0.04]")}>
      <p className="font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1.5 font-saveful text-[11px] text-gray-500">{label}</p>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name?: string; label?: string }[];
}) {
  return (
    <label className="block min-w-0">
      {label ? <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">{label}</span> : null}
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name ?? item.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}

function PageButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} className="flex h-8 w-8 items-center justify-center rounded-lg font-saveful text-sm text-gray-700 hover:bg-[#F7F6F2] disabled:opacity-40">
      {children}
    </button>
  );
}
