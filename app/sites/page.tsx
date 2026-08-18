"use client";

import Link from "next/link";
import { useState } from "react";
import { PortalShell } from "@/components/layout/PortalShell";
import { demoOrganization, demoSites } from "@/lib/demo";
import { useSession } from "@/lib/auth";
import type { OrganizationSite } from "@/types/enterprise";

export default function SitesPage() {
  const user = useSession();
  const [expandedId, setExpandedId] = useState<string | null>(demoSites[0]?.id ?? null);
  const managedCount = demoSites.filter((site) => site.hasManager).length;
  const brandName = user?.organization || demoOrganization.name;

  return (
    <PortalShell>
      <div className="relative h-full overflow-y-auto bg-[#F7F6F2] p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="overflow-hidden rounded-3xl bg-saveful-green px-6 py-7 text-white shadow-sm md:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="font-saveful text-xs uppercase tracking-[0.2em] text-white/70">
                  {brandName}
                </p>
                <h1 className="mt-1 font-saveful-bold text-3xl md:text-4xl">Your sites</h1>
                <p className="mt-2 max-w-xl font-saveful text-sm text-white/80">
                  {demoOrganization.address}
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-saveful text-sm">
                {managedCount} of {demoSites.length} sites managed
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-saveful-semibold text-lg text-gray-900">What to do today</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { href: "/listings/new", label: "Create listing", primary: true },
                { href: "/sites/new", label: "Add location" },
                { href: "/insights", label: "View analytics" },
                { href: "/account", label: "Your profile" },
              ].map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`rounded-2xl border px-4 py-5 font-saveful-semibold shadow-sm transition hover:-translate-y-0.5 ${
                    action.primary
                      ? "border-saveful-green bg-saveful-green text-white"
                      : "border-white bg-white text-gray-800 hover:border-saveful-green/30"
                  }`}
                >
                  {action.label}
                </Link>
              ))}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-saveful-semibold text-lg text-gray-900">Your Sites</h2>
                <span className="rounded-full bg-saveful-green/10 px-2 py-0.5 font-saveful text-xs text-saveful-green">
                  {demoSites.length}
                </span>
              </div>
              <Link
                href="/sites/new"
                className="font-saveful-semibold text-sm text-saveful-green hover:underline"
              >
                + Add
              </Link>
            </div>

            <div className="space-y-3">
              {demoSites.map((site, index) => (
                <SiteCard
                  key={site.id}
                  site={site}
                  index={index}
                  expanded={expandedId === site.id}
                  onToggle={() =>
                    setExpandedId((current) => (current === site.id ? null : site.id))
                  }
                />
              ))}
            </div>
          </section>
        </div>
      </div>
    </PortalShell>
  );
}

function SiteCard({
  site,
  index,
  expanded,
  onToggle,
}: {
  site: OrganizationSite;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <article className="rounded-3xl border border-white bg-white p-5 shadow-sm">
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-4 text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-saveful-cream font-saveful-bold text-saveful-green">
          {site.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
              {site.isDefault ? "Default" : `Site ${index + 1}`}
            </span>
            {site.isDefault ? (
              <span className="rounded-full bg-saveful-green/10 px-2 py-0.5 font-saveful text-[11px] text-saveful-green">
                HQ
              </span>
            ) : null}
            <span
              className={`rounded-full px-2 py-0.5 font-saveful text-[11px] ${
                site.hasManager
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-amber-50 text-amber-700"
              }`}
            >
              {site.hasManager ? "Managed" : "Needs manager"}
            </span>
          </div>
          <h3 className="mt-1 font-saveful-bold text-lg text-gray-900">{site.name}</h3>
          <p className="font-saveful text-sm text-gray-500">
            {[site.address, site.postCode].filter(Boolean).join(" · ")}
          </p>
        </div>
      </button>

      {expanded ? (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="font-saveful text-xs uppercase tracking-wide text-gray-500">Manager</dt>
              <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">{site.managerName}</dd>
            </div>
            <div>
              <dt className="font-saveful text-xs uppercase tracking-wide text-gray-500">Email</dt>
              <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">{site.email}</dd>
            </div>
            <div>
              <dt className="font-saveful text-xs uppercase tracking-wide text-gray-500">Mobile</dt>
              <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">{site.mobile}</dd>
            </div>
          </dl>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              href={`/sites/${site.id}/access`}
              className="rounded-xl bg-saveful-green px-4 py-2 font-saveful-semibold text-sm text-white"
            >
              Manage access
            </Link>
            <Link
              href="/insights"
              className="rounded-xl border border-gray-200 px-4 py-2 font-saveful-semibold text-sm text-gray-700"
            >
              Site analytics
            </Link>
            <Link
              href="/listings/new"
              className="rounded-xl border border-gray-200 px-4 py-2 font-saveful-semibold text-sm text-gray-700"
            >
              Create listing
            </Link>
          </div>
        </div>
      ) : null}
    </article>
  );
}
