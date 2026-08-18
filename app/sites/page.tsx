"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  ChartColumn,
  ChevronDown,
  MapPin,
  Plus,
  UserRound,
  UtensilsCrossed,
} from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import { Button } from "@/components/ui/button";
import {
  BrandMark,
  PortalPageHeader,
  PortalPageShell,
  PortalSectionLabel,
  PortalStatCard,
  StatusBadge,
} from "@/components/ui/Portal";
import { demoListings, demoOrganization, demoSites } from "@/lib/demo";
import { useSession } from "@/lib/auth";
import type { OrganizationSite } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const todayActions = [
  {
    href: "/listings/new",
    label: "Create listing",
    hint: "List surplus from a site",
    icon: UtensilsCrossed,
    primary: true,
  },
  {
    href: "/sites/new",
    label: "Add location",
    hint: "Open another kitchen",
    icon: MapPin,
    primary: false,
  },
  {
    href: "/insights",
    label: "View analytics",
    hint: "Food, meals, and CO₂",
    icon: ChartColumn,
    primary: false,
  },
  {
    href: "/account",
    label: "Your profile",
    hint: "Organisation and contact",
    icon: UserRound,
    primary: false,
  },
] as const;

export default function SitesPage() {
  const user = useSession();
  const [expandedId, setExpandedId] = useState<string | null>(demoSites[0]?.id ?? null);
  const managedCount = demoSites.filter((site) => site.hasManager).length;
  const greetingName = user?.name?.split(" ")[0] || "there";
  const unmanagedSite = demoSites.find((site) => !site.hasManager);
  const activeListings = demoListings.filter((listing) => listing.status === "ACTIVE").length;

  return (
    <PortalShell>
      <PortalPageShell>
        <PortalPageHeader
          eyebrow="Operations overview"
          brand={
            <BrandMark
              name={demoOrganization.name}
              caption={demoOrganization.address}
            />
          }
          title={`Welcome back, ${greetingName}`}
          description="HQ and branch locations, managers, and what to do today across your multi-site business."
          actions={
            <>
              <Button href="/insights" variant="secondary" className="w-full sm:w-auto">
                <ChartColumn className="h-4 w-4" />
                Insights
              </Button>
              <Button href="/listings/new" className="w-full sm:w-auto">
                <Plus className="h-4 w-4" />
                Create listing
              </Button>
            </>
          }
        />

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <PortalStatCard
            label="Sites"
            value={String(demoSites.length)}
            hint="HQ + branches"
            icon={Building2}
          />
          <PortalStatCard
            label="Managed"
            value={`${managedCount}/${demoSites.length}`}
            hint="Locations with a manager"
            icon={UserRound}
            accent="teal"
          />
          <PortalStatCard
            label="Needs manager"
            value={String(demoSites.length - managedCount)}
            hint="Assign access to list"
            icon={UserRound}
            accent="amber"
            href={unmanagedSite ? `/sites/${unmanagedSite.id}/access` : undefined}
          />
          <PortalStatCard
            label="Active listings"
            value={String(activeListings)}
            hint="Surplus waiting for pickup"
            icon={UtensilsCrossed}
            accent="orange"
            href="/listings"
          />
        </div>

        <section>
          <PortalSectionLabel
            title="What to do today"
            subtitle="The same shortcuts as restaurant multi-site home"
          />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {todayActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.label}
                  href={action.href}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl border p-3.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
                    action.primary
                      ? "border-saveful-green bg-saveful-green text-white"
                      : "border-gray-100 bg-white text-gray-900 hover:border-saveful-green/25",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                      action.primary ? "bg-white/15" : "bg-saveful-green/10 text-saveful-green",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-saveful-semibold text-sm">{action.label}</p>
                    <p
                      className={cn(
                        "mt-0.5 font-saveful text-xs",
                        action.primary ? "text-white/75" : "text-gray-500",
                      )}
                    >
                      {action.hint}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        <section>
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <h2 className="font-saveful-bold text-lg text-gray-900">Your sites</h2>
              <span className="rounded-full bg-saveful-green/10 px-2 py-0.5 font-saveful-semibold text-xs text-saveful-green">
                {demoSites.length}
              </span>
            </div>
            <Button href="/sites/new" variant="secondary" size="sm" className="w-full sm:w-auto">
              <Plus className="h-3.5 w-3.5" />
              Add location
            </Button>
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
      </PortalPageShell>
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
    <article className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-4 text-left sm:gap-4"
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 font-saveful-bold text-saveful-green">
          {site.name.charAt(0)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
              {site.isDefault ? "Default" : `Site ${index + 1}`}
            </span>
            {site.isDefault ? <StatusBadge tone="green">HQ</StatusBadge> : null}
            <StatusBadge tone={site.hasManager ? "green" : "amber"}>
              {site.hasManager ? "Managed" : "Needs manager"}
            </StatusBadge>
          </div>
          <h3 className="mt-1 font-saveful-bold text-base text-gray-900 sm:text-lg">
            {site.name}
          </h3>
          <p className="mt-0.5 font-saveful text-sm text-gray-500">
            {[site.address, site.postCode].filter(Boolean).join(" · ")}
          </p>
        </div>
        <ChevronDown
          className={cn(
            "mt-1 h-4 w-4 shrink-0 text-gray-400 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded ? (
        <div className="border-t border-gray-100 px-4 pb-4 pt-4">
          <dl className="grid grid-cols-1 gap-4 rounded-xl bg-[#F7F6F2] p-4 sm:grid-cols-3">
            <div className="min-w-0">
              <dt className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                Manager
              </dt>
              <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">
                {site.managerName}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                Email
              </dt>
              <dd className="mt-1 break-all font-saveful-semibold text-sm text-gray-900">
                {site.email}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                Mobile
              </dt>
              <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">
                {site.mobile}
              </dd>
            </div>
          </dl>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button href={`/sites/${site.id}/access`} size="sm" className="w-full sm:w-auto">
              Manage access
            </Button>
            <Button href="/insights" variant="secondary" size="sm" className="w-full sm:w-auto">
              Site analytics
            </Button>
            <Button href="/listings/new" variant="secondary" size="sm" className="w-full sm:w-auto">
              Create listing
            </Button>
          </div>
        </div>
      ) : null}
    </article>
  );
}
