"use client";

import { AppPage } from "@/components/layout/AppPage";
import { demoSites } from "@/lib/demo";

const metrics = [
  { label: "Food redistributed", value: "128 kg" },
  { label: "Meals created", value: "256" },
  { label: "CO₂ avoided", value: "84 kg" },
  { label: "Collections", value: "19" },
];

export default function InsightsPage() {
  return (
    <AppPage
      eyebrow="Impact"
      title="Insights"
      description="Organisation-wide impact, with a site filter for branch-level analytics."
    >
      <div className="flex flex-wrap gap-2">
        <button type="button" className="rounded-full bg-saveful-green px-3 py-1.5 font-saveful text-xs text-white">
          All sites
        </button>
        {demoSites.map((site) => (
          <button
            key={site.id}
            type="button"
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 font-saveful text-xs text-gray-700"
          >
            {site.name}
          </button>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <article key={metric.label} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <p className="font-saveful text-[11px] uppercase tracking-[0.16em] text-gray-500">
              {metric.label}
            </p>
            <p className="mt-3 font-saveful-bold text-3xl text-gray-900">{metric.value}</p>
          </article>
        ))}
      </div>
    </AppPage>
  );
}
