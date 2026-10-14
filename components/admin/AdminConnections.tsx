"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { AdminPage, AdminSection, FilterSelect, TablePager, useAdminFilters, type PageSize } from "@/components/admin/AdminChrome";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import { FilterResetButton } from "@/components/network/FilterBar";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { adminFilterOptions, organisationProfileHref, type AdminFilters } from "@/lib/admin";
import {
  getAdminConnectionsSummary,
  type AdminConnectionImpact,
  type AdminConnectionRow,
  type AdminConnectionsSummary,
} from "@/lib/api";
import { periodLabel, rangeForFilters } from "@/lib/dates";
import { calculateImpact, formatCount, formatKg } from "@/lib/impact";
import { cn } from "@/lib/utils";

const STATUSES = [
  { id: "ACTIVE", label: "Active", help: "Accepted and running" },
  { id: "PENDING", label: "Awaiting reply", help: "Charity hasn't answered yet" },
  { id: "PAUSED", label: "Paused", help: "Temporarily on hold" },
  { id: "ENDED", label: "Ended", help: "Was active, now stopped" },
  { id: "DECLINED", label: "Declined", help: "Charity said no" },
  { id: "EXPIRED", label: "Expired", help: "No reply in time" },
] as const;

type StatusId = (typeof STATUSES)[number]["id"];
type StatusFilter = "all" | StatusId;

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DATE_TIME = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Sydney",
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : DATE_TIME.format(date);
}

function formatMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60) % 24;
  const mins = minutes % 60;
  return `${hours % 12 || 12}:${String(mins).padStart(2, "0")} ${hours >= 12 ? "pm" : "am"}`;
}

function scheduleDays(row: AdminConnectionRow) {
  const days = [...row.daysOfWeek].sort((a, b) => a - b);
  if (days.length === 7) return "Every day";
  return days.map((day) => WEEKDAYS[day - 1]).filter(Boolean).join(", ") || "—";
}

function statusMeta(status: string) {
  return STATUSES.find((item) => item.id === status) ?? { id: status, label: status, help: "" };
}

function share(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}

function connectionsQuery(filters: AdminFilters) {
  const range = rangeForFilters(filters);
  const params = new URLSearchParams();
  if (range.startDate) params.set("from", range.startDate);
  if (range.endDate) params.set("to", range.endDate);
  if (filters.organisationId !== "all") params.set("organisationId", filters.organisationId);
  return params;
}

export function AdminConnections() {
  const { filters, update, reset, query } = useAdminFilters();
  const [summary, setSummary] = useState<AdminConnectionsSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const requestKey = connectionsQuery(filters).toString();

  useEffect(() => {
    let cancelled = false;
    getAdminConnectionsSummary(new URLSearchParams(requestKey))
      .then((data) => {
        if (cancelled) return;
        setSummary(data);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Connections could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [requestKey]);

  const organisationOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const org of adminFilterOptions(filters).organisations) names.set(org.id, org.name);
    for (const row of summary?.connections ?? []) {
      names.set(String(row.donor.orgId), row.donor.orgName);
      names.set(String(row.receiver.orgId), row.receiver.orgName);
    }
    return [...names.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [filters, summary]);

  const term = search.trim().toLowerCase();
  const searched = (summary?.connections ?? []).filter((row) => {
    if (!term) return true;
    return [
      row.donor.orgName,
      row.donor.siteName,
      row.receiver.orgName,
      row.receiver.siteName,
      row.invitedBy?.name,
      row.invitedBy?.email,
      row.respondedBy?.name,
      row.respondedBy?.email,
    ].some((value) => value?.toLowerCase().includes(term));
  });
  const statusCounts = new Map<string, number>();
  for (const row of searched) statusCounts.set(row.status, (statusCounts.get(row.status) ?? 0) + 1);
  const rows = status === "all" ? searched : searched.filter((row) => row.status === status);
  const rowsKg = rows.reduce((sum, row) => sum + row.collectedKg, 0);
  const rowsPickups = rows.reduce((sum, row) => sum + row.pickups, 0);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const filtersActive =
    filters.period !== "30" || Boolean(filters.from || filters.to) || filters.organisationId !== "all" || status !== "all" || Boolean(term);
  const period = periodLabel(filters.period, { from: filters.from, to: filters.to });
  const periodLower = period.charAt(0).toLowerCase() + period.slice(1);

  const impact = summary?.impact;
  const totalKg = (impact?.connection.collectedKg ?? 0) + (impact?.oneOff.collectedKg ?? 0);
  const connectionShare = share(impact?.connection.collectedKg ?? 0, totalKg);

  const selectStatus = (next: StatusFilter) => {
    setStatus(next);
    setPage(1);
  };

  return (
    <AdminPage
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Connections"
      hint="A Connection is a standing arrangement where a business site offers its surplus food to one charity first."
    >
      <div className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-end gap-2 overflow-x-auto px-3 py-2.5">
          <div className="grid min-w-[620px] flex-1 grid-cols-3 gap-2">
            <PeriodFilter compact showDates={false} period={filters.period} from={filters.from} to={filters.to} onChange={(next) => update(next)} />
            <FilterSelect
              compact
              label="Organisation"
              value={filters.organisationId}
              onChange={(organisationId) => update({ organisationId })}
              options={[{ id: "all", name: "All" }, ...organisationOptions]}
            />
            <label className="block min-w-0">
              <span className="mb-1 block truncate font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Search</span>
              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Business, charity, site or person"
                className="h-8 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2 font-saveful text-xs text-gray-800 outline-none placeholder:text-gray-400 focus:border-saveful-green/40"
              />
            </label>
          </div>
          <FilterResetButton
            active={filtersActive}
            onReset={() => {
              selectStatus("all");
              setSearch("");
              reset();
            }}
          />
        </div>
        {filters.period === "custom" ? (
          <div className="border-t border-gray-100 px-3 py-2 sm:max-w-md">
            <PeriodFilter compact datesOnly period="custom" from={filters.from} to={filters.to} onChange={(next) => update(next)} />
          </div>
        ) : null}
      </div>

      {error && !summary ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">{error}</p>
      ) : !summary ? (
        <SavefulPageLoader message="Loading connections…" fullScreen={false} />
      ) : (
        <>
          <AdminSection title="Connections by status" action={<span className="font-saveful text-[11px] text-gray-400">Click a status to filter the list</span>}>
            <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4 xl:grid-cols-7">
              <StatusTile label="All connections" help="Every invitation sent" value={searched.length} active={status === "all"} onClick={() => selectStatus("all")} />
              {STATUSES.map((item) => (
                <StatusTile
                  key={item.id}
                  label={item.label}
                  help={item.help}
                  value={statusCounts.get(item.id) ?? 0}
                  active={status === item.id}
                  onClick={() => selectStatus(item.id)}
                />
              ))}
            </div>
          </AdminSection>

          <AdminSection title="Food collected: Connections vs one-off listings" action={<span className="font-saveful text-[11px] text-gray-400">{period}</span>}>
            <div className="space-y-3 p-3.5">
              <p className="font-saveful text-sm text-gray-700">
                <span className="font-saveful-bold text-gray-900">{connectionShare}%</span> of all food collected {periodLower} came through Connections (
                {formatKg(impact?.connection.collectedKg ?? 0)} of {formatKg(totalKg)}).
              </p>
              <div className="flex h-2.5 overflow-hidden rounded-full bg-gray-100">
                <div className="bg-saveful-green" style={{ width: `${connectionShare}%` }} />
                <div className="bg-gray-300" style={{ width: `${totalKg > 0 ? 100 - connectionShare : 0}%` }} />
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="px-3 py-2.5 font-saveful" />
                      <th className="px-3 py-2.5 text-right font-saveful">Listings</th>
                      <th className="px-3 py-2.5 text-right font-saveful">Food listed</th>
                      <th className="px-3 py-2.5 text-right font-saveful">Pickups</th>
                      <th className="px-3 py-2.5 text-right font-saveful">Food collected</th>
                      <th className="px-3 py-2.5 text-right font-saveful">Meals</th>
                      <th className="px-3 py-2.5 text-right font-saveful">CO₂e avoided</th>
                    </tr>
                  </thead>
                  <tbody>
                    {impact ? (
                      <>
                        <ImpactRow dot="bg-saveful-green" label="Connections" detail="Offered to one charity first" bucket={impact.connection} />
                        <ImpactRow dot="bg-gray-300" label="One-off listings" detail="Posted to the whole network" bucket={impact.oneOff} />
                      </>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </AdminSection>

          <AdminSection
            title={status === "all" ? "All connections" : `${statusMeta(status).label} connections`}
            action={<span className="font-saveful text-[11px] text-gray-400">Click a row for schedule, contacts and pickup days</span>}
          >
            {rows.length === 0 ? (
              <p className="px-3.5 py-10 text-center font-saveful text-sm text-gray-500">No connections match these filters.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="px-3 py-2.5 font-saveful">Business → Charity</th>
                      <th className="px-3 py-2.5 font-saveful">Status</th>
                      <th className="px-3 py-2.5 font-saveful">Invited</th>
                      <th className="px-3 py-2.5 font-saveful">Reply</th>
                      <th className="px-3 py-2.5 text-right font-saveful">Food collected</th>
                      <th className="w-8 px-3 py-2.5" />
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((row) => {
                      const open = openId === row.id;
                      return (
                        <Fragment key={row.id}>
                          <tr
                            className={cn("cursor-pointer border-b border-gray-50 align-top hover:bg-[#FAF7F0]", open && "bg-[#FAF7F0]/70")}
                            onClick={() => setOpenId(open ? null : row.id)}
                          >
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap items-start gap-x-2 gap-y-1">
                                <PartyCell party={row.donor} query={query} />
                                <span className="pt-0.5 font-saveful text-sm text-gray-300">→</span>
                                <PartyCell party={row.receiver} query={query} />
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <StatusPill status={row.status} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 font-saveful text-sm text-gray-700">
                              {formatDateTime(row.createdAt)}
                              <p className="font-saveful text-[11px] text-gray-400">by {row.invitedBy?.name ?? "unknown user"}</p>
                            </td>
                            <td className="px-3 py-3 font-saveful text-sm text-gray-700">
                              <ReplyCell row={row} />
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 text-right font-saveful text-sm tabular-nums text-gray-800">
                              {formatKg(row.collectedKg)}
                              <p className="font-saveful text-[11px] text-gray-400">
                                {formatCount(row.pickups)} {row.pickups === 1 ? "pickup" : "pickups"}
                              </p>
                            </td>
                            <td className="px-3 py-3 text-right">
                              <ChevronDown className={cn("ml-auto h-4 w-4 text-gray-400 transition", open && "rotate-180")} />
                            </td>
                          </tr>
                          {open ? (
                            <tr className="border-b border-gray-100 bg-[#FAF7F0]/70">
                              <td colSpan={6} className="px-3 pb-4 pt-1">
                                <ConnectionDetail row={row} periodLower={periodLower} />
                              </td>
                            </tr>
                          ) : null}
                        </Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200 bg-[#F7F6F2]/60">
                      <td colSpan={4} className="px-3 py-2.5 font-saveful text-xs text-gray-600">
                        Total for {formatCount(rows.length)} {rows.length === 1 ? "connection" : "connections"} · {periodLower}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-saveful-semibold text-sm tabular-nums text-gray-900">
                        {formatKg(rowsKg)}
                        <p className="font-saveful text-[11px] font-normal text-gray-500">
                          {formatCount(rowsPickups)} {rowsPickups === 1 ? "pickup" : "pickups"}
                        </p>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
                <TablePager
                  page={currentPage}
                  pageSize={pageSize}
                  total={rows.length}
                  noun="connections"
                  onPage={setPage}
                  onPageSize={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </div>
            )}
          </AdminSection>
        </>
      )}
    </AdminPage>
  );
}

function StatusTile({
  label,
  help,
  value,
  active,
  onClick,
}: {
  label: string;
  help: string;
  value: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "relative flex flex-col bg-white px-4 py-3.5 text-left transition hover:bg-[#FAF9F6]",
        active && "bg-[#FAF9F6] after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-saveful-green",
      )}
    >
      <span className={cn("font-saveful text-[11px] uppercase tracking-[0.1em]", active ? "text-saveful-green" : "text-gray-500")}>{label}</span>
      <span className="mt-2 font-saveful-bold text-2xl tabular-nums leading-none text-gray-900">{formatCount(value)}</span>
      <span className="mt-1.5 font-saveful text-[11px] leading-snug text-gray-400">{help}</span>
    </button>
  );
}

function ImpactRow({ dot, label, detail, bucket }: { dot: string; label: string; detail: string; bucket: AdminConnectionImpact }) {
  const impact = calculateImpact(bucket.collectedKg);
  return (
    <tr className="border-b border-gray-50 last:border-0">
      <td className="px-3 py-3">
        <p className="flex items-center gap-2 font-saveful-semibold text-sm text-gray-900">
          <span className={cn("h-2 w-2 rounded-full", dot)} />
          {label}
        </p>
        <p className="pl-4 font-saveful text-[11px] text-gray-400">{detail}</p>
      </td>
      <td className="px-3 py-3 text-right font-saveful text-sm tabular-nums text-gray-800">{formatCount(bucket.listings)}</td>
      <td className="px-3 py-3 text-right font-saveful text-sm tabular-nums text-gray-800">{formatKg(bucket.listedKg)}</td>
      <td className="px-3 py-3 text-right font-saveful text-sm tabular-nums text-gray-800">{formatCount(bucket.pickups)}</td>
      <td className="px-3 py-3 text-right font-saveful-semibold text-sm tabular-nums text-gray-900">{formatKg(bucket.collectedKg)}</td>
      <td className="px-3 py-3 text-right font-saveful text-sm tabular-nums text-gray-800">{formatCount(impact.mealsCreated)}</td>
      <td className="px-3 py-3 text-right font-saveful text-sm tabular-nums text-gray-800">{formatKg(impact.co2AvoidedKg)}</td>
    </tr>
  );
}

function ReplyCell({ row }: { row: AdminConnectionRow }) {
  if (row.status === "PENDING") {
    return (
      <>
        <span className="text-gray-500">Not answered yet</span>
        {row.invitationExpiresAt ? <p className="font-saveful text-[11px] text-gray-400">Expires {formatDateTime(row.invitationExpiresAt)}</p> : null}
      </>
    );
  }
  if (row.status === "EXPIRED") return <span className="text-gray-500">No reply</span>;
  if (!row.respondedAt) return <span className="text-gray-400">—</span>;
  return (
    <>
      {row.status === "DECLINED" ? "Declined" : "Accepted"} by {row.respondedBy?.name ?? "unknown user"}
      <p className="font-saveful text-[11px] text-gray-400">{formatDateTime(row.respondedAt)}</p>
    </>
  );
}

function ConnectionDetail({ row, periodLower }: { row: AdminConnectionRow; periodLower: string }) {
  const days = row.days;
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <DetailGroup title="Schedule">
        <Detail label="Days">{scheduleDays(row)}</Detail>
        <Detail label="Pickup window">
          {formatMinutes(row.windowStartMinutes)}–{formatMinutes(row.windowEndMinutes)}
        </Detail>
        <Detail label="Usual food">{row.typicalSurplus || "—"}</Detail>
        <Detail label="Usual amount">{row.typicalQuantity || "—"}</Detail>
      </DetailGroup>
      <DetailGroup title="People">
        <Detail label={`Invited by (${row.donor.orgName})`}>
          <PersonLink person={row.invitedBy} />
        </Detail>
        <Detail label={`${row.status === "DECLINED" ? "Declined" : "Accepted"} by (${row.receiver.orgName})`}>
          {row.respondedAt ? <PersonLink person={row.respondedBy} /> : "—"}
        </Detail>
        {row.endedAt ? (
          <Detail label="Ended">
            {formatDateTime(row.endedAt)}
            {row.endedBy ? ` by ${row.endedBy.name}` : ""}
          </Detail>
        ) : null}
      </DetailGroup>
      <DetailGroup title={`Pickup days ${periodLower}`}>
        {days.scheduled === 0 ? (
          <p className="font-saveful text-sm text-gray-500">No scheduled pickup days in this period.</p>
        ) : (
          <ul className="space-y-1 font-saveful text-sm text-gray-800">
            <DayLine label="Scheduled" value={days.scheduled} strong />
            <DayLine label="Charity collected" value={days.collected} />
            <DayLine label="Passed on to the network" value={days.released} />
            <DayLine label="Business had no food" value={days.noFood} />
            <DayLine label="Missed (no one responded)" value={days.missed} />
            {days.open > 0 ? <DayLine label="Still in progress" value={days.open} /> : null}
          </ul>
        )}
        <p className="pt-1 font-saveful text-[11px] text-gray-400">
          {formatCount(row.listings)} listings created · {formatKg(row.collectedKg)} collected
        </p>
      </DetailGroup>
    </div>
  );
}

function DayLine({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <li className={cn("flex justify-between gap-4", strong && "font-saveful-semibold")}>
      <span>{label}</span>
      <span className="tabular-nums">{formatCount(value)}</span>
    </li>
  );
}

function PartyCell({ party, query }: { party: AdminConnectionRow["donor"]; query: string }) {
  return (
    <div className="min-w-0">
      <Link
        href={organisationProfileHref(String(party.orgId), query)}
        onClick={(event) => event.stopPropagation()}
        className="font-saveful-semibold text-sm text-saveful-green hover:underline"
      >
        {party.orgName}
      </Link>
      {party.siteName && party.siteName !== party.orgName ? (
        <p className="font-saveful text-[11px] text-gray-400">
          <Link href={`/admin/sites/${party.siteId}${query}`} onClick={(event) => event.stopPropagation()} className="hover:text-saveful-green hover:underline">
            {party.siteName}
          </Link>
        </p>
      ) : null}
    </div>
  );
}

function PersonLink({ person }: { person: AdminConnectionRow["invitedBy"] }) {
  if (!person) return <>—</>;
  return (
    <>
      {person.name}
      {person.email ? (
        <a href={`mailto:${person.email}`} className="block text-[11px] text-saveful-green hover:underline">
          {person.email}
        </a>
      ) : null}
    </>
  );
}

function DetailGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
      <h3 className="font-saveful-semibold text-[11px] uppercase tracking-[0.12em] text-gray-500">{title}</h3>
      {children}
    </section>
  );
}

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-400">{label}</dt>
      <dd className="mt-0.5 font-saveful text-sm text-gray-800">{children}</dd>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const meta = statusMeta(status);
  const live = status === "ACTIVE";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-[#F7F6F2] px-2 py-0.5 font-saveful text-[11px]",
        live ? "text-gray-800" : "text-gray-500",
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-saveful-green" : "bg-gray-300")} />
      {meta.label}
    </span>
  );
}
