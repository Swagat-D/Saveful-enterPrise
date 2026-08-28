"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeftRight,
  Ban,
  Bell,
  Building2,
  ChevronRight,
  Download,
  Info,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Shield,
  Users,
  X,
} from "lucide-react";
import { AdminPortalShell } from "@/components/layout/AdminPortalShell";
import { MoreFilters } from "@/components/network/FilterBar";
import { PortalPageShell } from "@/components/ui/Portal";
import { useSession } from "@/lib/auth";
import { adminHas } from "@/lib/adminRoles";
import {
  ADMIN_AUDIT_AREAS,
  ADMIN_AUDIT_RETENTION_MONTHS,
  EMPTY_ADMIN_AUDIT_FILTERS,
  actorInitials,
  adminAuditAreaLabel,
  adminAuditEntityTypeLabel,
  adminAuditFilterOptions,
  adminAuditFiltersToQuery,
  exportAdminAuditCsv,
  firstChange,
  hasActiveAdminAuditFilters,
  listAdminAudit,
  listAllAdminAudit,
  parseAdminAuditFilters,
  useAdminAuditVersion,
  type AdminAuditEntry,
  type AdminAuditFilters,
} from "@/lib/adminAudit";
import { formatDisplayDateTime, periodLabel } from "@/lib/dates";
import type { PeriodKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

const ENTITY_TYPES = [
  { id: "organisation", name: "Organisation" },
  { id: "site", name: "Site" },
  { id: "listing", name: "Listing" },
  { id: "collection", name: "Collection" },
  { id: "role", name: "Role" },
  { id: "notification", name: "Notification" },
];

export function AdminAudit() {
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const version = useAdminAuditVersion();
  const filters = useMemo(() => parseAdminAuditFilters(searchParams), [searchParams]);
  const allEntries = useMemo(() => listAllAdminAudit(), [version]);
  const options = useMemo(() => adminAuditFilterOptions(allEntries), [allEntries]);
  const rows = useMemo(() => listAdminAudit(filters), [filters, version]);
  const pageCount = Math.max(1, Math.ceil(rows.length / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const paged = rows.slice((page - 1) * filters.pageSize, page * filters.pageSize);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((entry) => entry.id === selectedId) ?? null;

  const setFilters = (next: AdminAuditFilters) => {
    router.replace(`${pathname}${adminAuditFiltersToQuery({ ...next, page: next.page || 1 })}`, { scroll: false });
  };
  const update = (patch: Partial<AdminAuditFilters>) => setFilters({ ...filters, ...patch, page: patch.page ?? 1 });

  const filterCount = [
    filters.period !== "30",
    filters.user !== "all",
    filters.organisationId !== "all",
    filters.entityType !== "all",
    filters.action !== "all",
    filters.area !== "all",
  ].filter(Boolean).length;

  if (user && !adminHas(user, "viewAudit")) {
    return (
      <AdminPortalShell>
        <PortalPageShell>
          <section className="rounded-2xl border border-black/[0.05] bg-white px-5 py-10 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <h1 className="font-saveful-bold text-xl text-gray-900">You don’t have access</h1>
            <p className="mx-auto mt-2 max-w-md font-saveful text-sm text-gray-500">
              Platform Audit Log is limited to Saveful roles that include View Platform Audit Log.
            </p>
            <Link
              href="/admin/dashboard"
              className="mt-5 inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
            >
              Back to dashboard
            </Link>
          </section>
        </PortalPageShell>
      </AdminPortalShell>
    );
  }

  return (
    <AdminPortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <span className="text-gray-700">Platform Audit Log</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">Platform Audit Log</h1>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                A complete history of Saveful Admin changes across organisations, sites, roles and platform rules.
              </p>
            </div>
            <button
              type="button"
              onClick={() => exportAdminAuditCsv(rows)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
            >
              <Download className="h-3.5 w-3.5" />
              Export
            </button>
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            <WorkspaceSection
              title="Administrative changes"
              hint={periodLabel(filters.period)}
              action={
                hasActiveAdminAuditFilters(filters) ? (
                  <button
                    type="button"
                    onClick={() => setFilters(EMPTY_ADMIN_AUDIT_FILTERS)}
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
                      placeholder="Search activity"
                      className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] pl-8 pr-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white"
                    />
                  </label>
                  <div className="lg:hidden">
                    <MoreFilters
                      count={filterCount}
                      summary={`${periodLabel(filters.period)}${filterCount ? ` · ${filterCount} filters` : ""}`}
                      title="Filter audit log"
                      subtitle="Search, table and export use the same filters."
                      onReset={() => setFilters(EMPTY_ADMIN_AUDIT_FILTERS)}
                    >
                      <div className="grid grid-cols-1 gap-3">
                        <FilterSelect label="Period" value={filters.period} onChange={(period) => update({ period: period as PeriodKey })} options={PERIODS} />
                        <FilterSelect label="Saveful user" value={filters.user} onChange={(next) => update({ user: next })} options={[{ id: "all", name: "All" }, ...options.users.map((name) => ({ id: name, name }))]} />
                        <FilterSelect label="Organisation" value={filters.organisationId} onChange={(organisationId) => update({ organisationId })} options={[{ id: "all", name: "All" }, ...options.organisations]} />
                        <FilterSelect label="Entity type" value={filters.entityType} onChange={(entityType) => update({ entityType })} options={[{ id: "all", name: "All" }, ...ENTITY_TYPES]} />
                        <FilterSelect label="Action" value={filters.action} onChange={(action) => update({ action })} options={[{ id: "all", name: "All" }, ...options.actions.map((action) => ({ id: action, name: action }))]} />
                        <FilterSelect label="Area" value={filters.area} onChange={(area) => update({ area })} options={[{ id: "all", name: "All" }, ...ADMIN_AUDIT_AREAS.map((item) => ({ id: item.id, name: item.label }))]} />
                      </div>
                    </MoreFilters>
                  </div>
                </div>
                <div className="hidden grid-cols-2 gap-2 lg:grid xl:grid-cols-3">
                  <FilterSelect value={filters.period} onChange={(period) => update({ period: period as PeriodKey })} options={PERIODS.map((item) => ({ id: item.id, name: `Period: ${item.label}` }))} />
                  <FilterSelect value={filters.user} onChange={(next) => update({ user: next })} options={[{ id: "all", name: "Saveful user: All" }, ...options.users.map((name) => ({ id: name, name: `Saveful user: ${name}` }))]} />
                  <FilterSelect value={filters.organisationId} onChange={(organisationId) => update({ organisationId })} options={[{ id: "all", name: "Organisation: All" }, ...options.organisations.map((item) => ({ id: item.id, name: `Organisation: ${item.name}` }))]} />
                  <FilterSelect value={filters.entityType} onChange={(entityType) => update({ entityType })} options={[{ id: "all", name: "Entity type: All" }, ...ENTITY_TYPES.map((item) => ({ id: item.id, name: `Entity type: ${item.name}` }))]} />
                  <FilterSelect value={filters.action} onChange={(action) => update({ action })} options={[{ id: "all", name: "Action: All" }, ...options.actions.map((action) => ({ id: action, name: `Action: ${action}` }))]} />
                  <FilterSelect value={filters.area} onChange={(area) => update({ area })} options={[{ id: "all", name: "Area: All" }, ...ADMIN_AUDIT_AREAS.map((item) => ({ id: item.id, name: `Area: ${item.label}` }))]} />
                </div>
              </div>

              <div className="hidden overflow-x-auto px-3.5 pb-2 lg:block">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="pb-2 pr-3 font-saveful">Date/time</th>
                      <th className="pb-2 pr-3 font-saveful">User</th>
                      <th className="pb-2 pr-3 font-saveful">Action</th>
                      <th className="pb-2 pr-3 font-saveful">Organisation</th>
                      <th className="pb-2 pr-3 font-saveful">Entity</th>
                      <th className="pb-2 pr-3 font-saveful">Entity ID</th>
                      <th className="pb-2 pr-3 font-saveful">Previous value</th>
                      <th className="pb-2 pr-3 font-saveful">New value</th>
                      <th className="pb-2 font-saveful"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((entry) => {
                      const change = firstChange(entry);
                      return (
                        <tr
                          key={entry.id}
                          className={cn(
                            "cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]",
                            selectedId === entry.id && "bg-saveful-green/[0.04]",
                          )}
                          onClick={() => setSelectedId((current) => (current === entry.id ? null : entry.id))}
                        >
                          <td className="whitespace-nowrap py-2.5 pr-3 font-saveful text-xs text-gray-500">
                            {formatDisplayDateTime(entry.at)}
                          </td>
                          <td className="py-2.5 pr-3 font-saveful-semibold text-sm text-gray-900">{entry.actor}</td>
                          <td className="py-2.5 pr-3">
                            <ActionLabel action={entry.action} />
                          </td>
                          <td className="py-2.5 pr-3 font-saveful text-sm text-gray-600">{entry.organisationName}</td>
                          <td className="py-2.5 pr-3 font-saveful text-sm text-gray-600">
                            <span className="line-clamp-2">{entry.entity}</span>
                          </td>
                          <td className="py-2.5 pr-3 font-saveful text-xs tabular-nums text-gray-500">{entry.entityId}</td>
                          <td className="max-w-[10rem] py-2.5 pr-3 font-saveful text-sm text-gray-600">
                            <span className="line-clamp-2">{change ? `${change.field}: ${change.previous || "—"}` : "—"}</span>
                          </td>
                          <td className="max-w-[10rem] py-2.5 pr-3 font-saveful text-sm text-gray-800">
                            <span className="line-clamp-2">{change ? `${change.field}: ${change.next || "—"}` : "—"}</span>
                          </td>
                          <td className="py-2.5 text-gray-300">
                            <ChevronRight className="h-4 w-4" />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 px-3.5 lg:hidden">
                {paged.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => setSelectedId((current) => (current === entry.id ? null : entry.id))}
                    className={cn("flex w-full items-start gap-3 py-2.5 text-left", selectedId === entry.id && "bg-saveful-green/[0.04]")}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-saveful-semibold text-sm text-gray-900">{entry.action}</p>
                      <p className="mt-0.5 font-saveful text-xs text-gray-500">
                        {entry.actor} · {entry.organisationName}
                        {entry.entity ? ` · ${entry.entity}` : ""}
                      </p>
                      <p className="mt-1 font-saveful text-xs text-gray-500">{formatDisplayDateTime(entry.at)}</p>
                    </div>
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" />
                  </button>
                ))}
              </div>

              {rows.length === 0 ? (
                <p className="px-3.5 pb-3.5 font-saveful text-sm text-gray-500">No audit records match these filters.</p>
              ) : (
                <div className="flex flex-col gap-3 border-t border-gray-100 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-saveful text-xs text-gray-500">
                    Showing {(page - 1) * filters.pageSize + 1}–{Math.min(page * filters.pageSize, rows.length)} of {rows.length}{" "}
                    results
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
                      <PageButton disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                        ‹
                      </PageButton>
                      <span className="min-w-8 px-2 text-center font-saveful text-sm">{page}</span>
                      <PageButton disabled={page >= pageCount} onClick={() => update({ page: page + 1 })}>
                        ›
                      </PageButton>
                    </div>
                  </div>
                </div>
              )}
            </WorkspaceSection>

            <p className="flex items-start gap-2 font-saveful text-xs text-gray-500">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
              <span>
                Platform Audit Log shows Saveful Admin changes only. Routine listing and collection activity is recorded
                in Activity. Records are retained for {ADMIN_AUDIT_RETENTION_MONTHS} months and cannot be edited or
                deleted through Saveful Admin.
              </span>
            </p>
          </div>
        </section>
      </PortalPageShell>
      {selected ? <ChangeDetails entry={selected} onClose={() => setSelectedId(null)} /> : null}
    </AdminPortalShell>
  );
}

function ChangeDetails({ entry, onClose }: { entry: AdminAuditEntry; onClose: () => void }) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center">
      <button type="button" aria-label="Close change details" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-audit-detail-title"
        className="relative flex max-h-[88dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-xl"
      >
        <header className="flex items-start justify-between gap-3 px-5 pt-5">
          <div>
            <p className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">Audit record</p>
            <h2 id="admin-audit-detail-title" className="mt-1 font-saveful-bold text-lg text-gray-900">
              Change details
            </h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-gray-500 hover:bg-[#F7F6F2] hover:text-gray-800">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-5 overflow-y-auto px-5 py-5">
          <DetailRow label="Changed by">
            <span className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-saveful-green font-saveful-semibold text-[11px] text-white">
                {actorInitials(entry.actor)}
              </span>
              <span>
                <span className="block font-saveful-semibold text-sm text-gray-900">{entry.actor}</span>
                <span className="block font-saveful text-xs text-gray-500">{entry.actorEmail}</span>
              </span>
            </span>
          </DetailRow>
          <DetailRow label="Date & time">{formatDisplayDateTime(entry.at)}</DetailRow>
          <DetailRow label="Action">
            <ActionLabel action={entry.action} />
          </DetailRow>
          <DetailRow label="Organisation">{entry.organisationName}</DetailRow>
          <DetailRow label="Area">{adminAuditAreaLabel(entry.area)}</DetailRow>
          <DetailRow label="Entity type">{adminAuditEntityTypeLabel(entry.entityType)}</DetailRow>
          <DetailRow label="Entity">{entry.entity}</DetailRow>
          <DetailRow label="Entity ID">{entry.entityId}</DetailRow>
          {entry.detail ? (
            <DetailRow label="Details">
              <span className="leading-relaxed">{entry.detail}</span>
            </DetailRow>
          ) : null}

          {entry.changes.length ? (
            <div className="space-y-4">
              {entry.changes.map((change) => (
                <div key={`${change.field}-${change.previous}-${change.next}`} className="space-y-2">
                  <p className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">{change.field}</p>
                  <div className="rounded-xl bg-[#F7F6F2] px-3.5 py-3">
                    <p className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">Previous</p>
                    <p className="mt-1 font-saveful text-sm text-gray-800">{change.previous || "—"}</p>
                  </div>
                  <div className="flex justify-center text-gray-300" aria-hidden>
                    ↓
                  </div>
                  <div className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-3">
                    <p className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">Changed to</p>
                    <p className="mt-1 font-saveful text-sm text-gray-900">{change.next || "—"}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          <div className="flex items-start gap-2 rounded-xl bg-[#F7F6F2] px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-saveful-green" />
            <p className="font-saveful text-xs leading-relaxed text-gray-600">
              Audit records cannot be edited or deleted through Saveful Admin. They are retained for{" "}
              {ADMIN_AUDIT_RETENTION_MONTHS} months for governance and security review.
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function ActionLabel({ action }: { action: string }) {
  const Icon = actionIcon(action);
  return (
    <span className="inline-flex items-center gap-1.5 font-saveful text-sm text-gray-800">
      <Icon className="h-3.5 w-3.5 text-saveful-green" />
      {action}
    </span>
  );
}

function actionIcon(action: string) {
  const value = action.toLowerCase();
  if (value.includes("deactivat")) return Ban;
  if (value.includes("reactivat")) return RotateCcw;
  if (value.includes("role") || value.includes("permission")) return Shield;
  if (value.includes("user") || value.includes("assigned")) return Users;
  if (value.includes("notification")) return Bell;
  if (value.includes("plan") || value.includes("billing")) return Settings;
  if (value.includes("created") || value.includes("added")) return Plus;
  if (value.includes("updated") || value.includes("changed")) return ArrowLeftRight;
  return Building2;
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">{label}</p>
      <div className="mt-1 font-saveful text-sm text-gray-800">{children}</div>
    </div>
  );
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
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg font-saveful text-sm text-gray-700 hover:bg-[#F7F6F2] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
