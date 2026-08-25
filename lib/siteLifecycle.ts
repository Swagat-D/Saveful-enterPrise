"use client";

import { useSyncExternalStore } from "react";
import { appendAudit } from "@/lib/audit";
import { demoNetworkSites } from "@/lib/network";
import type { OrganizationSite, SiteLifecycleStatus } from "@/types/enterprise";

const overrides = new Map<string, SiteLifecycleStatus>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSiteStatus(site: OrganizationSite): SiteLifecycleStatus {
  return overrides.get(site.id) ?? site.status;
}

export function setSiteStatus(siteId: string, status: SiteLifecycleStatus, actor = "Enterprise user") {
  const site = demoNetworkSites.find((item) => item.id === siteId);
  const previous = overrides.get(siteId) ?? site?.status ?? "active";
  overrides.set(siteId, status);
  if (previous !== status) {
    appendAudit({
      actor,
      action: status === "deactivated" ? "Site deactivated" : "Site reactivated",
      area: "sites",
      entity: site?.name ?? siteId,
      detail:
        status === "deactivated"
          ? `${site?.name ?? "Site"} was deactivated. Historical recovery records are unchanged.`
          : `${site?.name ?? "Site"} was restored to active.`,
      changes: [
        {
          field: "Status",
          previous: previous === "deactivated" ? "Deactivated" : "Active",
          next: status === "deactivated" ? "Deactivated" : "Active",
        },
      ],
    });
  }
  emit();
}

export function useSiteStatus(site: OrganizationSite): SiteLifecycleStatus {
  return useSyncExternalStore(
    subscribe,
    () => getSiteStatus(site),
    () => site.status,
  );
}

export function useSiteLifecycleVersion() {
  return useSyncExternalStore(
    subscribe,
    () => version,
    () => 0,
  );
}
