"use client";

import { useSyncExternalStore } from "react";
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

export function setSiteStatus(siteId: string, status: SiteLifecycleStatus) {
  overrides.set(siteId, status);
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
