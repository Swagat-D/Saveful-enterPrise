"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreVertical, RotateCcw } from "lucide-react";
import { AdminPortalShell } from "@/components/layout/AdminPortalShell";
import { PortalPageShell } from "@/components/ui/Portal";
import {
  adminFilterOptions,
  adminFiltersToQuery,
  EMPTY_ADMIN_FILTERS,
  ORG_TYPES,
  PARTICIPATION_ROLES,
  parseAdminFilters,
  rememberAdminFilters,
  urlHasAdminFilters,
  useAdminVersion,
  type AdminFilters,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40";

export function useAdminFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useAdminVersion();
  const filters = parseAdminFilters(searchParams);
  const setFilters = (next: AdminFilters) => {
    rememberAdminFilters(next, true);
    router.replace(`${pathname}${adminFiltersToQuery(next)}`, { scroll: false });
  };

  useEffect(() => {
    const query = adminFiltersToQuery(filters);
    if (query && !urlHasAdminFilters(searchParams)) {
      router.replace(`${pathname}${query}`, { scroll: false });
    }
  }, [filters, pathname, router, searchParams]);

  return {
    filters,
    setFilters,
    update: (patch: Partial<AdminFilters>) => setFilters({ ...filters, ...patch }),
    reset: () => setFilters(EMPTY_ADMIN_FILTERS),
    query: adminFiltersToQuery(filters),
  };
}

export function AdminPage({
  crumb,
  title,
  hint,
  actions,
  children,
  workspace,
}: {
  crumb?: { href: string; label: string }[];
  title: string;
  hint?: string;
  actions?: ReactNode;
  children: ReactNode;
  workspace?: boolean;
}) {
  return (
    <AdminPortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        {crumb?.length ? (
          <nav className="flex flex-wrap items-center gap-1.5 font-saveful text-xs text-gray-500">
            {crumb.map((item, index) => (
              <span key={item.href} className="flex items-center gap-1.5">
                {index > 0 ? <span className="text-gray-300">/</span> : null}
                <Link href={item.href} className="hover:text-saveful-green">
                  {item.label}
                </Link>
              </span>
            ))}
            <span className="text-gray-300">/</span>
            <span className="text-gray-700">{title}</span>
          </nav>
        ) : null}
        {workspace ? (
          <>
            <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <header className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <h1 className="font-saveful-bold text-xl leading-none text-gray-900">{title}</h1>
                  {hint ? <p className="mt-1 font-saveful text-xs text-gray-500">{hint}</p> : null}
                </div>
                {actions ? <div className="w-full shrink-0 sm:w-auto">{actions}</div> : null}
              </header>
            </section>
            <div className="space-y-3">{children}</div>
          </>
        ) : (
          <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="min-w-0">
                <h1 className="font-saveful-bold text-xl leading-none text-gray-900">{title}</h1>
                {hint ? <p className="mt-1 font-saveful text-xs text-gray-500">{hint}</p> : null}
              </div>
              {actions ? <div className="w-full shrink-0 sm:w-auto">{actions}</div> : null}
            </header>
            <div className="space-y-4 p-4 sm:p-5">{children}</div>
          </section>
        )}
      </PortalPageShell>
    </AdminPortalShell>
  );
}

export function AdminSection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("overflow-hidden rounded-xl border border-gray-200 bg-white", className)}>
      <div className="flex h-9 items-center gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="h-3.5 w-1 shrink-0 rounded-full bg-saveful-green" aria-hidden />
          <h2 className="truncate font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {children}
    </section>
  );
}

export function AdminFiltersBar({
  filters,
  onChange,
  onReset,
  organisations,
}: {
  filters: AdminFilters;
  onChange: (patch: Partial<AdminFilters>) => void;
  onReset: () => void;
  organisations?: { id: string; name: string }[];
}) {
  const options = adminFilterOptions(filters);
  const orgOptions = organisations ?? options.organisations;
  const active =
    filters.period !== "30" ||
    filters.country !== "all" ||
    filters.state !== "all" ||
    filters.orgType !== "all" ||
    filters.role !== "all" ||
    filters.organisationId !== "all" ||
    filters.pathway !== "all" ||
    Boolean(filters.q) ||
    filters.accountStatus !== "all" ||
    filters.activityStatus !== "all" ||
    filters.plan !== "all";

  return (
    <div className="rounded-xl border border-gray-200 bg-white">
      <div className="flex items-end gap-2 overflow-x-auto px-3 py-2.5">
        <div className="grid min-w-[980px] flex-1 grid-cols-7 gap-2">
          <FilterSelect
            compact
            label="Period"
            value={filters.period}
            onChange={(period) => onChange({ period: period as AdminFilters["period"] })}
            options={[
              { id: "7", name: "Last 7 days" },
              { id: "30", name: "Last 30 days" },
              { id: "90", name: "Last 90 days" },
              { id: "all", name: "All time" },
            ]}
          />
          <FilterSelect
            compact
            label="Country"
            value={filters.country}
            onChange={(country) => onChange({ country, state: "all", organisationId: "all" })}
            options={[{ id: "all", name: "All" }, ...options.countries]}
          />
          <FilterSelect
            compact
            label="State / Territory"
            value={filters.state}
            onChange={(state) => onChange({ state, organisationId: "all" })}
            options={[{ id: "all", name: "All" }, ...options.states]}
          />
          <FilterSelect
            compact
            label="Organisation Type"
            value={filters.orgType}
            onChange={(orgType) => onChange({ orgType: orgType as AdminFilters["orgType"], organisationId: "all" })}
            options={[{ id: "all", name: "All" }, ...ORG_TYPES.map((item) => ({ id: item.id, name: item.label }))]}
          />
          <FilterSelect
            compact
            label="Participation Role"
            value={filters.role}
            onChange={(role) => onChange({ role: role as AdminFilters["role"], organisationId: "all" })}
            options={[
              { id: "all", name: "All" },
              ...PARTICIPATION_ROLES.map((item) => ({ id: item.id, name: item.label })),
              { id: "both", name: "Both" },
            ]}
          />
          <FilterSelect
            compact
            label="Organisation"
            value={filters.organisationId}
            onChange={(organisationId) => onChange({ organisationId })}
            options={[{ id: "all", name: "All" }, ...orgOptions]}
          />
          <FilterSelect
            compact
            label="Recovery Pathway"
            value={filters.pathway}
            onChange={(pathway) => onChange({ pathway: pathway as AdminFilters["pathway"] })}
            options={[{ id: "all", name: "All" }, ...options.pathways]}
          />
        </div>
        <button
          type="button"
          onClick={onReset}
          disabled={!active}
          aria-label="Reset filters"
          className={cn(
            "mb-px flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black/[0.06] bg-[#F7F6F2] text-gray-500",
            active ? "hover:border-saveful-green/30 hover:text-saveful-green" : "opacity-40",
          )}
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export function FilterSelect({
  label,
  value,
  onChange,
  options,
  compact,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
  compact?: boolean;
}) {
  return (
    <label className="block min-w-0">
      {label ? (
        <span className={cn("block truncate font-saveful uppercase tracking-[0.12em] text-gray-500", compact ? "mb-1 text-[10px]" : "mb-1.5 text-[11px]")}>
          {label}
        </span>
      ) : null}
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(selectClass, compact && "h-8 px-2 pr-7 text-xs")}
        >
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
export type PageSize = (typeof PAGE_SIZE_OPTIONS)[number];

export function parsePageSize(value: number): PageSize {
  return value === 25 || value === 50 ? value : 10;
}

export function TablePager({
  page,
  pageSize,
  total,
  noun,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: PageSize;
  total: number;
  noun: string;
  onPage: (page: number) => void;
  onPageSize: (size: PageSize) => void;
}) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  if (total === 0) return null;
  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="font-saveful text-xs text-gray-500">
        Showing {(current - 1) * pageSize + 1}–{Math.min(current * pageSize, total)} of {total} {noun}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 font-saveful text-xs text-gray-500">
          Rows per page
          <select
            value={pageSize}
            onChange={(event) => onPageSize(Number(event.target.value) as PageSize)}
            className="h-8 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={current <= 1}
            onClick={() => onPage(current - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg font-saveful text-sm text-gray-700 hover:bg-[#F7F6F2] disabled:opacity-40"
          >
            ‹
          </button>
          <span className="min-w-8 px-2 text-center font-saveful text-sm">{current}</span>
          <button
            type="button"
            disabled={current >= pageCount}
            onClick={() => onPage(current + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg font-saveful text-sm text-gray-700 hover:bg-[#F7F6F2] disabled:opacity-40"
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminRowMenu({
  label,
  open,
  onOpenChange,
  children,
}: {
  label: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const place = () => {
    const button = buttonRef.current;
    const menu = menuRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) {
      setPos(null);
      return;
    }
    const width = menu?.offsetWidth || 176;
    const height = menu?.offsetHeight || 132;
    const left = Math.min(Math.max(8, rect.right - width), window.innerWidth - width - 8);
    const below = rect.bottom + 6;
    const top = below + height > window.innerHeight - 8 ? Math.max(8, rect.top - height - 6) : below;
    setPos({ top, left });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPos(null);
      return;
    }
    place();
    const frame = requestAnimationFrame(place);
    const onDoc = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      onOpenChangeRef.current(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChangeRef.current(false);
    };
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => onOpenChange(!open)}
        className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-[#F7F6F2]"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open && pos
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              style={{ top: pos.top, left: pos.left }}
              className="fixed z-[90] w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg"
            >
              {children}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}

export function StatusPill({ status }: { status: string }) {
  const tone =
    status === "Active" || status === "completed" || status === "claimed"
      ? "bg-emerald-50 text-emerald-700"
      : status === "Prospect" || status === "Onboarding" || status === "published" || status === "Never activated"
        ? "bg-amber-50 text-amber-700"
        : status === "Suspended"
          ? "bg-red-50 text-red-700"
          : status === "Inactive" || status === "Paused" || status === "Deactivated" || status === "expired" || status === "cancelled"
            ? "bg-gray-100 text-gray-600"
            : "bg-[#F7F6F2] text-gray-700";
  return <span className={cn("rounded-full px-2 py-0.5 font-saveful text-[11px] capitalize", tone)}>{status.replaceAll("_", " ")}</span>;
}
