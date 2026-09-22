"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { InsightsPanels } from "@/components/insights/InsightsWorkspace";
import { useSession } from "@/lib/auth";
import {
  EMPTY_INSIGHTS_FILTERS,
  INSIGHTS_PATHWAYS,
  buildInsightsModel,
  insightsFiltersToQuery,
  type InsightsFilters,
} from "@/lib/insights";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import { useRecoveryVersion } from "@/lib/network";
import { useLiveSitesVersion } from "@/lib/sitesDirectory";
import { scopeFromUser } from "@/lib/scope";

export function InsightsView({ lockedSiteId }: { lockedSiteId: string }) {
  const scope = scopeFromUser(useSession());
  const sitesVersion = useLiveSitesVersion();
  const recoveryVersion = useRecoveryVersion();
  const [filters, setFilters] = useState<InsightsFilters>({
    ...EMPTY_INSIGHTS_FILTERS,
    siteId: lockedSiteId,
  });
  const model = useMemo(
    () => buildInsightsModel(filters, scope),
    [filters, scope, sitesVersion, recoveryVersion],
  );
  const update = (patch: Partial<InsightsFilters>) =>
    setFilters((current) => ({ ...current, ...patch, siteId: lockedSiteId }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <PeriodFilter
            compact
            period={filters.period}
            from={filters.from}
            to={filters.to}
            onChange={(next) => update(next)}
          />
          <select
            value={filters.pathway}
            onChange={(event) => update({ pathway: event.target.value as InsightsFilters["pathway"] })}
            className="h-9 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none focus:border-saveful-green/40"
          >
            <option value="all">All pathways</option>
            {INSIGHTS_PATHWAYS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Link
          href={`/insights${insightsFiltersToQuery(filters)}`}
          className="font-saveful-semibold text-xs text-saveful-green hover:underline"
        >
          Open organisation Insights
        </Link>
      </div>
      <InsightsPanels model={model} filters={filters} onUpdate={update} compact />
    </div>
  );
}
