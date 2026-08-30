"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { AdminFiltersBar, AdminPage, StatusPill, TablePager, useAdminFilters, type PageSize } from "@/components/admin/AdminChrome";
import {
  EMPTY_ADMIN_FILTERS,
  filteredCollections,
  filteredListings,
  getCollection,
  getListing,
  getOrganisation,
  getSite,
  pathwayLabel,
  useAdminVersion,
} from "@/lib/admin";
import { formatKg } from "@/lib/impact";

function orgTabHref(orgId: string, query: string, tab: string) {
  const params = new URLSearchParams(query.startsWith("?") ? query.slice(1) : query);
  params.set("org", orgId);
  params.set("tab", tab);
  return `/admin/organisations/${orgId}?${params}`;
}

function contextOrgId(recordOrgId: string, filterOrgId: string) {
  return filterOrgId !== "all" ? filterOrgId : recordOrgId;
}

export function AdminListings() {
  useAdminVersion();
  const { filters, update, reset, query } = useAdminFilters();
  const rows = filteredListings(filters);
  return (
    <AdminPage
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Listings"
      hint={`${rows.length} listings in the selected period.`}
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <PagedTable noun="listings" rows={rows} columns={["Listing", "Organisation", "Site", "Pathway", "Kg", "Status"]}>
        {(row) => {
          const org = getOrganisation(row.orgId);
          const site = getSite(row.siteId);
          return (
            <tr key={row.id} className="border-b border-gray-50 last:border-0">
              <td className="px-3 py-3">
                <Link href={`/admin/listings/${row.id}${query}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
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
                <Link href={`/admin/sites/${row.siteId}${query}`} className="font-saveful text-sm text-saveful-green hover:underline">
                  {site?.name ?? row.siteId}
                </Link>
              </td>
              <td className="px-3 py-3 font-saveful text-sm text-gray-700">{pathwayLabel(row.pathway)}</td>
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
              <td className="px-3 py-3 font-saveful text-sm text-gray-700">{row.recipientName}</td>
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
  const { query, filters } = useAdminFilters();
  const row = getListing(id);
  const org = row ? getOrganisation(row.orgId) : null;
  const site = row ? getSite(row.siteId) : null;
  const collections = filteredCollections({ ...EMPTY_ADMIN_FILTERS, period: "all", organisationId: row?.orgId ?? "all" }).filter(
    (item) => item.listingId === id,
  );
  const contextOrg = getOrganisation(contextOrgId(row?.orgId ?? "", filters.organisationId)) ?? org;
  if (!row || !org || !site) {
    return (
      <AdminPage title="Listing">
        <p className="font-saveful text-sm text-gray-500">This listing was not found.</p>
      </AdminPage>
    );
  }
  return (
    <AdminPage
      crumb={[
        { href: `/admin/organisations${query}`, label: "Organisations" },
        { href: orgTabHref(contextOrg?.id ?? org.id, query, "listings"), label: contextOrg?.name ?? org.name },
        { href: `/admin/sites/${site.id}${query}`, label: site.name },
      ]}
      title={row.code}
      hint={row.food}
    >
      <dl className="grid gap-3 sm:grid-cols-4">
        <Info label="Organisation" value={org.name} href={orgTabHref(org.id, query, "listings")} />
        <Info label="Site" value={site.name} href={`/admin/sites/${site.id}${query}`} />
        <Info label="Pathway" value={pathwayLabel(row.pathway)} />
        <Info label="Listed" value={formatKg(row.quantityKg)} />
      </dl>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-3 py-2.5 font-saveful">Collection</th>
              <th className="px-3 py-2.5 font-saveful">Recipient</th>
              <th className="px-3 py-2.5 font-saveful">Kg</th>
            </tr>
          </thead>
          <tbody>
            {collections.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0">
                <td className="px-3 py-3">
                  <Link href={`/admin/collections/${item.id}${query}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                    {item.code}
                  </Link>
                </td>
                <td className="px-3 py-3 font-saveful text-sm text-gray-700">{item.recipientName}</td>
                <td className="px-3 py-3 font-saveful text-sm tabular-nums text-gray-800">{formatKg(item.quantityKg)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPage>
  );
}

export function AdminCollectionDetail({ id }: { id: string }) {
  const { query, filters } = useAdminFilters();
  const row = getCollection(id);
  const org = row ? getOrganisation(row.orgId) : null;
  const site = row ? getSite(row.siteId) : null;
  const listing = row ? getListing(row.listingId) : null;
  const recipientOrg = row?.recipientOrgId ? getOrganisation(row.recipientOrgId) : null;
  const contextOrg = getOrganisation(contextOrgId(row?.orgId ?? "", filters.organisationId)) ?? org;
  if (!row || !org || !site) {
    return (
      <AdminPage title="Collection">
        <p className="font-saveful text-sm text-gray-500">This collection was not found.</p>
      </AdminPage>
    );
  }
  return (
    <AdminPage
      crumb={[
        { href: `/admin/organisations${query}`, label: "Organisations" },
        { href: orgTabHref(contextOrg?.id ?? org.id, query, "collections"), label: contextOrg?.name ?? org.name },
        { href: `/admin/sites/${site.id}${query}`, label: site.name },
        listing ? { href: `/admin/listings/${listing.id}${query}`, label: listing.code } : { href: `/admin/listings${query}`, label: "Listing" },
      ]}
      title={row.code}
      hint={`${row.food} · ${formatKg(row.quantityKg)}`}
    >
      <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Info label="Organisation" value={org.name} href={orgTabHref(org.id, query, "collections")} />
        <Info label="Site" value={site.name} href={`/admin/sites/${site.id}${query}`} />
        <Info label="Listing" value={listing?.code ?? row.listingId} href={listing ? `/admin/listings/${listing.id}${query}` : undefined} />
        <Info
          label="Recipient"
          value={recipientOrg?.name ?? row.recipientName}
          href={recipientOrg ? orgTabHref(recipientOrg.id, query, "overview") : undefined}
        />
        <Info label="Pathway" value={pathwayLabel(row.pathway)} />
        <Info label="Status" value={row.status} />
      </dl>
    </AdminPage>
  );
}

function Info({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="rounded-xl bg-[#F7F6F2] px-3.5 py-3">
      <p className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">{label}</p>
      {href ? (
        <Link href={href} className="mt-1 block font-saveful-semibold text-sm text-saveful-green hover:underline">
          {value}
        </Link>
      ) : (
        <p className="mt-1 font-saveful-semibold text-sm capitalize text-gray-900">{value.replaceAll("_", " ")}</p>
      )}
    </div>
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
