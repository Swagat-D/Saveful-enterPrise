"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AdminFiltersBar, AdminPage, AdminSection, FilterSelect, StatusPill, TablePager, useAdminFilters, type PageSize } from "@/components/admin/AdminChrome";
import { AdminCollectionPanel, AdminListingPanel, collectionChipStatus, listingChipStatus } from "@/components/admin/AdminRecordPanels";
import {
  collectionKg,
  EMPTY_ADMIN_FILTERS,
  filteredCollections,
  filteredListings,
  getCollection,
  getListing,
  getOrganisation,
  getSite,
  isCompletedCollection,
  listListings,
  organisationProfileHref,
  pathwayLabel,
  refreshOrganisationListings,
  useAdminVersion,
  type AdminListing,
} from "@/lib/admin";
import { formatKg } from "@/lib/impact";
import { cn } from "@/lib/utils";

function orgTabHref(orgId: string, query: string, tab: string) {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  params.set("org", orgId);
  params.set("tab", tab);
  return `/admin/organisations/${orgId}?${params}`;
}

function contextOrgId(recordOrgId: string, filterOrgId: string) {
  return filterOrgId !== "all" ? filterOrgId : recordOrgId;
}

const LISTING_STATUSES = [
  { id: "all", name: "All" },
  { id: "ACTIVE", name: "Active" },
  { id: "CLAIMED", name: "Claimed" },
  { id: "COLLECTED", name: "Collected" },
  { id: "EXPIRED", name: "Expired" },
  { id: "CANCELLED", name: "Cancelled" },
] as const;

type ListingStatusFilter = (typeof LISTING_STATUSES)[number]["id"];

function collectedKgByListing(filters: Parameters<typeof filteredCollections>[0]) {
  const totals = new Map<string, number>();
  for (const row of filteredCollections(filters)) {
    if (!isCompletedCollection(row)) continue;
    totals.set(row.listingId, (totals.get(row.listingId) ?? 0) + collectionKg(row));
  }
  return totals;
}

function listingsCollectedInPeriod(periodRows: AdminListing[], collectedKg: Map<string, number>) {
  const rows = [...periodRows];
  const byId = new Map(listListings().map((row) => [row.id, row]));
  for (const id of collectedKg.keys()) {
    if (rows.some((row) => row.id === id)) continue;
    const listing = byId.get(id);
    if (listing) rows.push(listing);
  }
  return rows;
}

function listingDisplayStatus(row: AdminListing, collectedKg: number) {
  if (collectedKg > 0) return "COLLECTED";
  return listingChipStatus(row);
}

export function AdminListings() {
  useAdminVersion();
  const { filters, update, reset, query } = useAdminFilters();
  const [status, setStatus] = useState<ListingStatusFilter>("all");
  const periodRows = filteredListings(filters);
  const collectedKg = collectedKgByListing(filters);
  const rows = status === "COLLECTED" ? listingsCollectedInPeriod(periodRows, collectedKg) : periodRows;
  const visible = rows.filter((row) => status === "all" || listingDisplayStatus(row, collectedKg.get(row.id) ?? 0) === status);
  const visibleCollectedKg = visible.reduce((sum, row) => sum + (collectedKg.get(row.id) ?? 0), 0);
  return (
    <AdminPage
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Listings"
      hint={
        status === "COLLECTED"
          ? `${visible.length} listings collected ${formatKg(visibleCollectedKg)} in the selected period.`
          : `${periodRows.length} listings in the selected period. ${formatKg([...collectedKg.values()].reduce((sum, kg) => sum + kg, 0))} collected.`
      }
    >
      <AdminFiltersBar
        filters={filters}
        onChange={update}
        onReset={() => {
          setStatus("all");
          reset();
        }}
        extraActive={status !== "all"}
        extra={
          <FilterSelect
            compact
            label="Status"
            value={status}
            onChange={(value) => setStatus(value as ListingStatusFilter)}
            options={[...LISTING_STATUSES]}
          />
        }
      />
      <PagedTable noun="listings" rows={visible} columns={["Listing", "Organisation", "Site", "Pathway", "Kg", "Status"]}>
        {(row) => {
          const orgName = getOrganisation(row.orgId)?.name ?? row.orgName;
          const siteName = getSite(row.siteId)?.name ?? row.siteName;
          const recovered = collectedKg.get(row.id) ?? 0;
          return (
            <tr key={row.id} className="border-b border-gray-50 last:border-0">
              <td className="px-3 py-3">
                <Link href={`/admin/listings/${row.id}${query}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                  {row.code}
                </Link>
                <p className="font-saveful text-[11px] text-gray-400">{row.food}</p>
              </td>
              <td className="px-3 py-3">
                {orgName ? (
                  <Link href={`/admin/organisations/${row.orgId}${query}`} className="font-saveful text-sm text-saveful-green hover:underline">
                    {orgName}
                  </Link>
                ) : (
                  <span className="font-saveful text-sm text-gray-400">—</span>
                )}
              </td>
              <td className="px-3 py-3">
                {siteName ? (
                  <Link href={`/admin/sites/${row.siteId}${query}`} className="font-saveful text-sm text-saveful-green hover:underline">
                    {siteName}
                  </Link>
                ) : (
                  <span className="font-saveful text-sm text-gray-400">—</span>
                )}
              </td>
              <td className="px-3 py-3 font-saveful text-sm text-gray-700">{pathwayLabel(row.pathway)}</td>
              <td className="px-3 py-3 font-saveful text-sm tabular-nums text-gray-800">
                {formatKg(row.quantityKg)}
                {recovered > 0 && recovered !== row.quantityKg ? (
                  <p className="font-saveful text-[11px] text-gray-400">{formatKg(recovered)} collected</p>
                ) : null}
              </td>
              <td className="px-3 py-3">
                <StatusPill status={listingDisplayStatus(row, recovered)} />
              </td>
            </tr>
          );
        }}
      </PagedTable>
    </AdminPage>
  );
}

export function AdminCollections() {
  useAdminVersion();
  const { filters, update, reset, query } = useAdminFilters();
  const rows = filteredCollections(filters);
  return (
    <AdminPage
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Collections"
      hint={`${rows.length} collections in the selected period. Recovered volume uses the same impact methodology as Enterprise.`}
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <PagedTable noun="collections" rows={rows} columns={["Collection", "Organisation", "Listing", "Recipient", "Kg", "Status"]}>
        {(row) => {
          const org = getOrganisation(row.orgId);
          return (
            <tr key={row.id} className="border-b border-gray-50 last:border-0">
              <td className="px-3 py-3">
                <Link href={`/admin/collections/${row.id}${query}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                  {row.code}
                </Link>
                <p className="font-saveful text-[11px] text-gray-400">{row.food}</p>
              </td>
              <td className="px-3 py-3">
                <Link href={`/admin/organisations/${row.orgId}${query}`} className="font-saveful text-sm text-saveful-green hover:underline">
                  {org?.name ?? row.orgId}
                </Link>
              </td>
              <td className="px-3 py-3">
                <Link href={`/admin/listings/${row.listingId}${query}`} className="font-saveful text-sm text-saveful-green hover:underline">
                  {getListing(row.listingId)?.code ?? row.listingId}
                </Link>
              </td>
              <td className="px-3 py-3 font-saveful text-sm text-gray-700">
                {row.recipientOrgId ? (
                  <Link href={organisationProfileHref(row.recipientOrgId, query)} className="text-saveful-green hover:underline">
                    {row.recipientName}
                  </Link>
                ) : (
                  row.recipientName
                )}
              </td>
              <td className="px-3 py-3 font-saveful text-sm tabular-nums text-gray-800">{formatKg(row.quantityKg)}</td>
              <td className="px-3 py-3">
                <StatusPill status={row.status} />
              </td>
            </tr>
          );
        }}
      </PagedTable>
    </AdminPage>
  );
}

export function AdminListingDetail({ id }: { id: string }) {
  useAdminVersion();
  const { query } = useAdminFilters();
  const [openCollectionId, setOpenCollectionId] = useState<string | null>(null);
  const row = getListing(id);
  const org = row ? getOrganisation(row.orgId) : null;
  const site = row ? getSite(row.siteId) : null;

  useEffect(() => {
    if (row?.orgId) void refreshOrganisationListings(row.orgId).catch(() => undefined);
  }, [row?.orgId]);

  const collections = filteredCollections({ ...EMPTY_ADMIN_FILTERS, period: "all", organisationId: row?.orgId ?? "all" }).filter(
    (item) => item.listingId === id,
  );
  if (!row) {
    return (
      <AdminPage title="Listing">
        <p className="font-saveful text-sm text-gray-500">This listing was not found.</p>
      </AdminPage>
    );
  }
  return (
    <AdminPage
      workspace
      crumb={[
        { href: `/admin/listings${query}`, label: "Listings" },
        ...(org ? [{ href: orgTabHref(org.id, query, "listings"), label: org.name }] : row.orgName ? [{ href: `/admin/organisations/${row.orgId}${query}`, label: row.orgName }] : []),
        ...(site ? [{ href: `/admin/sites/${site.id}${query}`, label: site.name }] : row.siteName ? [{ href: `/admin/sites/${row.siteId}${query}`, label: row.siteName }] : []),
      ]}
      title={row.code}
      hint={`${row.food} · ${pathwayLabel(row.pathway)}`}
      actions={<StatusPill status={listingChipStatus(row)} />}
    >
      <AdminSection title="Listing details">
        <div className="px-3.5 py-3.5">
          <AdminListingPanel listing={row} orgName={org?.name} siteName={site?.name} />
        </div>
      </AdminSection>
      <AdminSection title="Collections" action={<span className="font-saveful text-xs text-gray-500">{collections.length}</span>}>
        {collections.length === 0 ? (
          <p className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">No collections on this listing yet.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {collections.map((item) => {
              const open = openCollectionId === item.id;
              return (
                <article key={item.id} className={cn(open && "bg-[#FAF7F0]/70")}>
                  <button
                    type="button"
                    onClick={() => setOpenCollectionId(open ? null : item.id)}
                    className="grid w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto_auto] items-center gap-3 px-3.5 py-3 text-left hover:bg-[#FAF7F0]"
                  >
                    <div className="min-w-0">
                      <p className="font-saveful-semibold text-sm text-gray-900">
                        {item.recipientOrgId ? (
                          <Link href={organisationProfileHref(item.recipientOrgId, query)} className="text-saveful-green hover:underline" onClick={(event) => event.stopPropagation()}>
                            {item.recipientName}
                          </Link>
                        ) : (
                          item.recipientName
                        )}
                      </p>
                      <p className="truncate font-saveful text-xs text-gray-500">{item.food}</p>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <p className="truncate font-saveful text-sm text-gray-800">{item.siteName || site?.name || "—"}</p>
                      <p className="truncate font-saveful text-[11px] text-gray-400">{item.pickupAddress || "—"}</p>
                    </div>
                    <p className="font-saveful-semibold text-sm tabular-nums text-gray-800">{formatKg(item.quantityKg)}</p>
                    <span className="flex items-center justify-end gap-2">
                      <StatusPill status={collectionChipStatus(item)} />
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition", open && "rotate-180")} />
                    </span>
                  </button>
                  {open ? (
                    <div className="border-t border-gray-100 px-3.5 py-3.5">
                      <AdminCollectionPanel row={item} siteName={site?.name} />
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </AdminSection>
    </AdminPage>
  );
}

export function AdminCollectionDetail({ id }: { id: string }) {
  useAdminVersion();
  const { query, filters } = useAdminFilters();
  const row = getCollection(id);
  const org = row ? getOrganisation(row.orgId) : null;
  const site = row ? getSite(row.siteId) : null;
  const listing = row ? getListing(row.listingId) : null;
  const recipientOrg = row?.recipientOrgId ? getOrganisation(row.recipientOrgId) : null;
  const contextOrg = getOrganisation(contextOrgId(row?.orgId ?? "", filters.organisationId)) ?? org;

  useEffect(() => {
    if (row?.orgId) void refreshOrganisationListings(row.orgId).catch(() => undefined);
  }, [row?.orgId]);

  if (!row) {
    return (
      <AdminPage title="Collection">
        <p className="font-saveful text-sm text-gray-500">This collection was not found.</p>
      </AdminPage>
    );
  }
  return (
    <AdminPage
      workspace
      crumb={[
        { href: `/admin/organisations${query}`, label: "Organisations" },
        contextOrg || org
          ? { href: orgTabHref(contextOrg?.id ?? org?.id ?? row.orgId, query, "collections"), label: contextOrg?.name ?? org?.name ?? "Organisation" }
          : { href: `/admin/collections${query}`, label: "Collections" },
        site ? { href: `/admin/sites/${site.id}${query}`, label: site.name } : { href: `/admin/collections${query}`, label: "Collection" },
        listing ? { href: `/admin/listings/${listing.id}${query}`, label: listing.code } : { href: `/admin/listings${query}`, label: "Listing" },
      ]}
      title={row.code}
      hint={`${row.food} · ${formatKg(row.quantityKg)}`}
      actions={<StatusPill status={collectionChipStatus(row)} />}
    >
      <AdminSection title="Collection details">
        <div className="px-3.5 py-3.5">
          <AdminCollectionPanel row={row} siteName={site?.name} />
        </div>
      </AdminSection>
      {recipientOrg ? (
        <p className="px-1 font-saveful text-sm text-gray-500">
          Recipient{" "}
          <Link href={organisationProfileHref(recipientOrg.id, query)} className="font-saveful-semibold text-saveful-green hover:underline">
            {recipientOrg.name}
          </Link>
        </p>
      ) : null}
    </AdminPage>
  );
}

function PagedTable<T>({
  rows,
  columns,
  noun,
  children,
}: {
  rows: T[];
  columns: string[];
  noun: string;
  children: (row: T) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = rows.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
            {columns.map((column) => (
              <th key={column} className="px-3 py-2.5 font-saveful">{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{paged.map((row) => children(row))}</tbody>
      </table>
      <TablePager
        page={current}
        pageSize={pageSize}
        total={rows.length}
        noun={noun}
        onPage={setPage}
        onPageSize={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </div>
  );
}
