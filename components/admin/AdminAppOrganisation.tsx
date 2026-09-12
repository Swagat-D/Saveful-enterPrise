"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronDown, Clock3, MapPin, Package, Truck } from "lucide-react";
import { AdminPage, AdminSection, StatusPill, useAdminFilters } from "@/components/admin/AdminChrome";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import {
  getAdminAppOrganisation,
  type AdminAppClaim,
  type AdminAppListing,
  type AdminAppOrganisationDetail,
} from "@/lib/api";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/dates";
import { formatKg } from "@/lib/impact";
import { formatLastActivity } from "@/lib/networkRules";
import { cn } from "@/lib/utils";

const PAGE_TABS = [
  { id: "overview", label: "Organisation" },
  { id: "listings", label: "Listings" },
  { id: "collections", label: "Collections" },
] as const;

const LISTING_STATUSES = [
  { id: "all", label: "All" },
  { id: "ACTIVE", label: "Active" },
  { id: "PARTIAL", label: "Partial" },
  { id: "CLAIMED", label: "Claimed" },
  { id: "COLLECTED", label: "Collected" },
  { id: "EXPIRED", label: "Expired" },
  { id: "CANCELLED", label: "Cancelled" },
] as const;

function listingDisplayStatus(listing: AdminAppListing) {
  const collected = listing.claims.some((claim) => claim.status === "COLLECTED");
  if (collected && (listing.remainingQtyKg <= 0 || listing.status === "CLAIMED")) return "COLLECTED";
  if (listing.status === "CLAIMED" && !collected) return "CLAIMED";
  return listing.status;
}

function roleLabel(role?: string | null) {
  if (role === "SUPER_ADMIN") return "Account owner";
  if (role === "ORG_ADMIN") return "Org admin";
  if (role === "ORG_MEMBER") return "Team member";
  return role || "—";
}

function regionLabel(region?: string | null) {
  if (region === "AU") return "Australia";
  if (region === "IN") return "India";
  if (region === "US") return "United States";
  return region || "—";
}

function pickupWindow(from?: string | null, to?: string | null) {
  if (!from && !to) return "—";
  if (from && to) return `${formatDisplayDateTime(from)} – ${formatDisplayDateTime(to)}`;
  return formatDisplayDateTime(from || to || undefined);
}

function foodSummary(listing: AdminAppListing) {
  return listing.items.map((item) => item.name).filter(Boolean).join(", ") || listing.listingType;
}

function collectedBy(claim: AdminAppClaim) {
  const parts = [claim.collectedBy || claim.claimant?.name, claim.driver ? `Driver ${claim.driver.name}` : null].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function AdminAppOrganisation({ organisationId }: { organisationId: string }) {
  const { query } = useAdminFilters();
  const [tab, setTab] = useState<(typeof PAGE_TABS)[number]["id"]>("overview");
  const [status, setStatus] = useState<(typeof LISTING_STATUSES)[number]["id"]>("all");
  const [openListingId, setOpenListingId] = useState<number | null>(null);
  const [data, setData] = useState<AdminAppOrganisationDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void getAdminAppOrganisation(organisationId)
      .then((payload) => {
        if (cancelled) return;
        setData(payload);
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Organisation could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const listingCounts = useMemo(() => {
    const counts: Record<string, number> = { all: data?.listings.length ?? 0 };
    for (const item of LISTING_STATUSES) {
      if (item.id === "all") continue;
      counts[item.id] = (data?.listings ?? []).filter((row) => listingDisplayStatus(row) === item.id).length;
    }
    return counts;
  }, [data]);

  const listings = useMemo(() => {
    const rows = data?.listings ?? [];
    if (status === "all") return rows;
    return rows.filter((row) => listingDisplayStatus(row) === status);
  }, [data, status]);

  if (loading) return <SavefulPageLoader message="Loading organisation…" />;
  if (error || !data) {
    return (
      <AdminPage crumb={[{ href: `/admin/app-users${query}`, label: "App users" }]} title="App organisation">
        <p className="font-saveful text-sm text-red-700">{error || "Organisation not found."}</p>
      </AdminPage>
    );
  }

  const org = data.organisation;

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/app-users${query}`, label: "App users" }]}
      title={org.name}
      hint={`${org.organisationTypeLabel}${org.plan ? ` · ${org.plan}` : ""}`}
    >
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
            {item.id === "listings" ? ` · ${listingCounts.all ?? 0}` : null}
            {item.id === "collections" ? ` · ${data.collections.length}` : null}
          </button>
        ))}
      </div>

      {tab === "overview" ? <Overview data={data} /> : null}
      {tab === "listings" ? (
        <Listings
          listings={listings}
          counts={listingCounts}
          status={status}
          onStatus={setStatus}
          openId={openListingId}
          onToggle={setOpenListingId}
        />
      ) : null}
      {tab === "collections" ? <Collections rows={data.collections} /> : null}
    </AdminPage>
  );
}

function Overview({ data }: { data: AdminAppOrganisationDetail }) {
  const org = data.organisation;
  return (
    <div className="space-y-3">
      <AdminSection title="Organisation">
        <dl className="grid gap-3 p-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <Info label="Name" value={org.name} />
          <Info label="App type" value={org.organisationTypeLabel} />
          <Info label="Region" value={regionLabel(org.region)} />
          <Info label="Venue" value={org.venueType?.replaceAll("_", " ") || "—"} />
          <Info label="Address" value={org.address || "—"} />
          <Info label="Brand" value={org.brandName || "—"} />
          <Info label="Plan" value={org.plan || "—"} />
          <Info label="Signed up" value={org.createdAt ? formatDisplayDate(org.createdAt) : "—"} />
        </dl>
      </AdminSection>

      <AdminSection title="People">
        <Table
          columns={["Name", "Email", "Role", "Status", "Last login"]}
          empty="No people on this account."
          rows={data.members.map((member) => [
            <span key={`${member.id}-name`}>
              <span className="block font-saveful-semibold text-sm text-gray-900">{member.name}</span>
              {member.mobile ? <span className="block font-saveful text-[11px] text-gray-400">{member.mobile}</span> : null}
            </span>,
            member.email,
            roleLabel(member.orgRole),
            <StatusPill key={`${member.id}-status`} status={member.status} />,
            member.lastLoginAt ? formatLastActivity(member.lastLoginAt) : "—",
          ])}
        />
      </AdminSection>

      <AdminSection title="Sites">
        <Table
          columns={["Site", "Address", "Contact", "Status"]}
          empty="No sites on this account."
          rows={data.sites.map((site) => [
            site.name,
            [site.address, site.postcode].filter(Boolean).join(" · ") || "—",
            [site.contactName, site.contactEmail, site.contactMobile].filter(Boolean).join(" · ") || "—",
            site.isActive ? "Active" : "Deactivated",
          ])}
        />
      </AdminSection>
    </div>
  );
}

function Listings({
  listings,
  counts,
  status,
  onStatus,
  openId,
  onToggle,
}: {
  listings: AdminAppListing[];
  counts: Record<string, number>;
  status: (typeof LISTING_STATUSES)[number]["id"];
  onStatus: (next: (typeof LISTING_STATUSES)[number]["id"]) => void;
  openId: number | null;
  onToggle: (id: number | null) => void;
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
                      <p className="font-saveful-semibold text-sm text-gray-900">#{listing.id}</p>
                      <p className="truncate font-saveful text-xs text-gray-500">{foodSummary(listing)}</p>
                    </div>
                    <div className="hidden min-w-0 sm:block">
                      <p className="truncate font-saveful text-sm text-gray-800">{listing.site.name}</p>
                      <p className="truncate font-saveful text-[11px] text-gray-400">{listing.pickupAddress}</p>
                    </div>
                    <p className="hidden font-saveful text-xs text-gray-500 lg:block">{pickupWindow(listing.pickupFromTime, listing.pickupByTime)}</p>
                    <p className="font-saveful-semibold text-sm tabular-nums text-gray-800">{formatKg(listing.totalQtyKg)}</p>
                    <span className="flex items-center justify-end gap-2">
                      <StatusPill status={listingDisplayStatus(listing)} />
                      <ChevronDown className={cn("h-4 w-4 text-gray-400 transition", open && "rotate-180")} />
                    </span>
                  </button>
                  {open ? <ListingDetail listing={listing} /> : null}
                </article>
              );
            })}
          </div>
        )}
      </AdminSection>
    </div>
  );
}

function ListingDetail({ listing }: { listing: AdminAppListing }) {
  return (
    <div className="space-y-3 border-t border-gray-100 px-3.5 py-3.5">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={Clock3} label="Listed" value={listing.createdAt ? formatDisplayDateTime(listing.createdAt) : "—"} />
        <Metric icon={Package} label="Best before" value={listing.bestBefore ? formatDisplayDate(listing.bestBefore) : "—"} />
        <Metric icon={Clock3} label="Pickup window" value={pickupWindow(listing.pickupFromTime, listing.pickupByTime)} />
        <Metric icon={MapPin} label="Remaining" value={formatKg(listing.remainingQtyKg)} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {listing.items.length ? (
          listing.items.map((item) => (
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
        {listing.claims.length ? (
          <Table
            columns={["Claimant", "Status", "Kg", "Collected", "Collected by"]}
            rows={listing.claims.map((claim) => [
              <span key={`${claim.id}-who`}>
                <span className="block font-saveful-semibold text-sm text-gray-900">{claim.claimant?.name || "—"}</span>
                {claim.claimant?.type ? <span className="block font-saveful text-[11px] text-gray-400">{claim.claimant.type}</span> : null}
              </span>,
              <StatusPill key={`${claim.id}-status`} status={claim.status} />,
              formatKg(claim.collectedKg),
              claim.collectedAt ? formatDisplayDateTime(claim.collectedAt) : "—",
              <span key={`${claim.id}-by`}>
                <span className="block text-sm text-gray-800">{claim.collectedBy || claim.claimant?.name || "—"}</span>
                {claim.driver ? <span className="block font-saveful text-[11px] text-gray-400">Driver {claim.driver.name}</span> : null}
              </span>,
            ])}
          />
        ) : (
          <p className="px-3 py-6 text-center font-saveful text-sm text-gray-500">No claims on this listing yet.</p>
        )}
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

function Collections({ rows }: { rows: AdminAppClaim[] }) {
  return (
    <AdminSection title="Collections" action={<span className="font-saveful text-xs text-gray-500">{rows.length}</span>}>
      <Table
        columns={["From", "Food", "Pickup window", "Status", "Kg", "Collected", "Collected by"]}
        empty="This organisation has not collected any listings yet."
        rows={rows.map((row) => [
          row.providerName || "—",
          row.food || `Listing #${row.listingId ?? "—"}`,
          pickupWindow(row.pickupFromTime, row.pickupByTime),
          <StatusPill key={`${row.id}-status`} status={row.status} />,
          formatKg(row.collectedKg),
          row.collectedAt ? formatDisplayDateTime(row.collectedAt) : "—",
          collectedBy(row),
        ])}
      />
    </AdminSection>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-saveful text-[11px] uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-0.5 font-saveful text-sm text-gray-800">{value}</dd>
    </div>
  );
}

function Table({
  columns,
  rows,
  empty,
}: {
  columns: string[];
  rows: Array<Array<ReactNode>>;
  empty?: string;
}) {
  if (!rows.length && empty) {
    return <p className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">{empty}</p>;
  }
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
