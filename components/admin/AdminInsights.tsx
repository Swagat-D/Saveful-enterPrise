"use client";

import { AdminFiltersBar, AdminPage, AdminSection, useAdminFilters } from "@/components/admin/AdminChrome";
import { buildAdminOverview } from "@/lib/admin";
import { formatCount, formatKg } from "@/lib/impact";

export function AdminInsights() {
  const { filters, update, reset, query } = useAdminFilters();
  const model = buildAdminOverview(filters);

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Insights & Reports"
      hint="Detailed platform analysis. The dashboard stays as the ‘what do we need to know now’ view."
    >
      <AdminFiltersBar filters={filters} onChange={update} onReset={reset} />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label="Food recovered" value={formatKg(model.metrics.recoveredKg)} />
        <Stat label="CO₂ avoided" value={formatKg(model.metrics.co2AvoidedKg)} />
        <Stat label="Collections" value={formatCount(model.metrics.collections)} />
        <Stat label="Listings published" value={formatCount(model.operations.listingsPublished)} />
        <Stat label="Claim rate" value={`${model.operations.claimRate}%`} />
        <Stat label="Recovery rate" value={`${model.operations.recoveryRate}%`} />
        <Stat label="Organisations" value={formatCount(model.metrics.organisations)} />
        <Stat label="Sites" value={formatCount(model.metrics.sites)} />
      </div>
      <AdminSection title="Recovery pathways">
        <ul className="divide-y divide-gray-50">
          {model.pathways.map((item) => (
            <li key={item.pathway} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
              <span className="flex min-w-0 items-center gap-2 font-saveful text-sm text-gray-700">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                <span className="truncate">{item.label}</span>
              </span>
              <span className="shrink-0 font-saveful text-sm tabular-nums text-gray-800">
                {formatKg(item.kg)} · {item.percent}%
              </span>
            </li>
          ))}
        </ul>
      </AdminSection>
    </AdminPage>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-3.5 py-3">
      <p className="font-saveful text-[11px] text-gray-500">{label}</p>
      <p className="mt-1.5 font-saveful-bold text-lg tabular-nums text-gray-900">{value}</p>
    </div>
  );
}
