"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TablePager, type PageSize } from "@/components/admin/AdminChrome";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { useSession } from "@/lib/auth";
import { refreshEnterpriseWorkspace } from "@/lib/enterpriseLive";
import {
  EMPTY_ACTIVITY_FILTERS,
  activityFiltersToQuery,
  listEnterpriseActivity,
  parseActivityFilters,
  useActivityVersion,
  type ActivityFilters,
} from "@/lib/activity";
import { getOrganization, useOrganizationVersion } from "@/lib/organization";
import { formatLastActivity } from "@/lib/networkRules";
import { useOrgStructureVersion } from "@/lib/orgStructure";
import { scopeFromUser } from "@/lib/scope";
import { useUsersVersion } from "@/lib/users";
import type { PeriodKey } from "@/types/enterprise";

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40";

const PERIODS: { id: PeriodKey; label: string }[] = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "all", label: "All time" },
];

export function ActivityWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSession();
  const scope = scopeFromUser(user);
  useOrganizationVersion();
  useOrgStructureVersion();
  useUsersVersion();
  const activityVersion = useActivityVersion();
  const filters = useMemo(() => parseActivityFilters(searchParams), [searchParams]);
  const rows = useMemo(() => listEnterpriseActivity(filters, scope), [filters, scope, activityVersion]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = rows.slice((current - 1) * pageSize, current * pageSize);
  const organization = getOrganization();

  useEffect(() => {
    if (!user || user.portal === "admin") return;
    void refreshEnterpriseWorkspace({ session: user }).catch(() => undefined);
  }, [user]);

  const setFilters = (next: ActivityFilters) => {
    setPage(1);
    router.replace(`${pathname}${activityFiltersToQuery({ ...next, page: 1 })}`, { scroll: false });
  };

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
                Sites, users, listings and collections across your organisation.
              </p>
            </div>
          </header>
        </section>

        <div className="rounded-xl border border-gray-200 bg-white">
          <div className="flex items-end gap-2 px-3 py-2.5">
            <label className="block min-w-[10rem]">
              <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">Period</span>
              <div className="relative">
                <select
                  value={filters.period}
                  onChange={(event) => setFilters({ ...filters, period: event.target.value as PeriodKey })}
                  className={selectClass}
                >
                  {PERIODS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
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
            {filters.period !== "30" ? (
              <button
                type="button"
                onClick={() => setFilters(EMPTY_ACTIVITY_FILTERS)}
                className="mb-0.5 h-9 rounded-lg px-2.5 font-saveful-semibold text-xs text-saveful-green hover:bg-[#FAF7F0]"
              >
                Reset
              </button>
            ) : null}
          </div>
        </div>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <div className="flex h-9 items-center gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5">
            <span className="h-3.5 w-1 shrink-0 rounded-full bg-saveful-green" aria-hidden />
            <h2 className="truncate font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">Recent events</h2>
          </div>
          {rows.length === 0 ? (
            <p className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">No activity in this period.</p>
          ) : (
            <ul>
              {paged.map((row) => (
                <li key={row.id} className="border-b border-gray-50 last:border-0">
                  <Link href={row.href} className="flex items-start justify-between gap-3 px-3.5 py-2.5 hover:bg-[#FAF7F0]">
                    <div className="min-w-0">
                      <p className="font-saveful-semibold text-sm text-gray-900">{row.kind}</p>
                      <p className="truncate font-saveful text-xs text-gray-500">{row.detail}</p>
                      <p className="mt-0.5 font-saveful text-[11px] text-gray-400">
                        {organization.name || "Enterprise"} · {row.type}
                      </p>
                    </div>
                    <span className="shrink-0 font-saveful text-xs text-gray-400">{formatLastActivity(row.at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <TablePager
            page={current}
            pageSize={pageSize}
            total={rows.length}
            noun="events"
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}
