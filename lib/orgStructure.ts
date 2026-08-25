"use client";

import { useSyncExternalStore } from "react";
import { appendAudit } from "@/lib/audit";
import { demoClusters, demoGroups, demoNetworkSites, demoTerritories, recoveryTransactions } from "@/lib/network";
import type { OrgStructureKind, OrgUnitStatus, OrganizationSite } from "@/types/enterprise";

export type { OrgStructureKind };

export type OrgStructureUnit = {
  id: string;
  name: string;
  code: string;
  description: string;
  status: OrgUnitStatus;
};

export type SiteOrgPatch = {
  groupId?: string | null;
  territoryId?: string | null;
  clusterId?: string | null;
};

export type StructureDraft = {
  name: string;
  code: string;
  description: string;
};

const UNIT_CODES: Record<string, string> = {
  kitchen: "HK",
  cafe: "HC",
  catering: "HCT",
  events: "HE",
  cbd: "CBD",
  east: "EAST",
  west: "WEST",
  north: "NORTH",
  quay: "CQ",
  inner: "INNER",
  bondi: "BONDI",
  parra: "PARRA",
  northsyd: "NSYD",
  liverpool: "LIV",
};

const UNIT_DESCRIPTIONS: Record<string, string> = {
  kitchen: "Production kitchens and commissary sites.",
  cafe: "Cafe and counter-service sites.",
  catering: "Off-site catering operations.",
  events: "Venue and event kitchens.",
};

function seedUnit(unit: { id: string; name: string }): OrgStructureUnit {
  return {
    id: unit.id,
    name: unit.name,
    code: UNIT_CODES[unit.id] ?? "",
    description: UNIT_DESCRIPTIONS[unit.id] ?? "",
    status: "active",
  };
}

type State = {
  group: OrgStructureUnit[];
  territory: OrgStructureUnit[];
  cluster: OrgStructureUnit[];
  assignments: Record<string, SiteOrgPatch>;
};

const listeners = new Set<() => void>();
let version = 0;
let state: State = {
  group: demoGroups.map(seedUnit),
  territory: demoTerritories.map(seedUnit),
  cluster: demoClusters.map(seedUnit),
  assignments: {},
};

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useOrgStructureVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

export function listUnits(kind: OrgStructureKind) {
  return state[kind];
}

export function listActiveUnits(kind: OrgStructureKind) {
  return state[kind].filter((unit) => unit.status === "active");
}

export function getUnit(kind: OrgStructureKind, id?: string | null) {
  if (!id) return null;
  return state[kind].find((unit) => unit.id === id) ?? null;
}

export function structureLabel(kind: OrgStructureKind) {
  return kind === "group" ? "Group" : kind === "territory" ? "Territory" : "Cluster";
}

function siteField(kind: OrgStructureKind): keyof SiteOrgPatch {
  return kind === "group" ? "groupId" : kind === "territory" ? "territoryId" : "clusterId";
}

function snapshotField(kind: OrgStructureKind): "groupId" | "territoryId" | "clusterId" {
  return siteField(kind);
}

export function resolveSite(site: OrganizationSite): OrganizationSite {
  const patch = state.assignments[site.id];
  if (!patch) return site;
  return {
    ...site,
    groupId: patch.groupId !== undefined ? patch.groupId : site.groupId,
    territoryId: patch.territoryId !== undefined ? patch.territoryId : site.territoryId,
    clusterId: patch.clusterId !== undefined ? patch.clusterId : site.clusterId,
  };
}

export function sitesAssignedTo(kind: OrgStructureKind, id: string) {
  const field = siteField(kind);
  return demoNetworkSites.map(resolveSite).filter((site) => site[field] === id);
}

export function hasHistoricalData(kind: OrgStructureKind, id: string) {
  const field = snapshotField(kind);
  return recoveryTransactions.some((row) => row.snapshot[field] === id);
}

export function canDeleteUnit(kind: OrgStructureKind, id: string) {
  return !hasHistoricalData(kind, id) && sitesAssignedTo(kind, id).length === 0;
}

function slugId(name: string, kind: OrgStructureKind) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 24) || kind;
  let id = base;
  let index = 2;
  while (state[kind].some((unit) => unit.id === id)) {
    id = `${base}-${index}`;
    index += 1;
  }
  return id;
}

function uniqueName(kind: OrgStructureKind, name: string, excludeId?: string) {
  const value = name.trim().toLowerCase();
  return !state[kind].some((unit) => unit.id !== excludeId && unit.name.trim().toLowerCase() === value);
}

export function saveUnit(kind: OrgStructureKind, draft: StructureDraft, existingId?: string, actor = "Enterprise user") {
  const name = draft.name.trim();
  if (!name) return { ok: false as const, error: `${structureLabel(kind)} name is required.` };
  if (!uniqueName(kind, name, existingId)) {
    return { ok: false as const, error: `A ${structureLabel(kind).toLowerCase()} with this name already exists.` };
  }

  const label = structureLabel(kind);
  const code = draft.code.trim().toUpperCase();
  const description = draft.description.trim().slice(0, 250);

  if (existingId) {
    const previous = getUnit(kind, existingId);
    state = {
      ...state,
      [kind]: state[kind].map((unit) =>
        unit.id === existingId
          ? {
              ...unit,
              name,
              code,
              description,
            }
          : unit,
      ),
    };
    const changes = [
      previous && previous.name !== name ? { field: "Name", previous: previous.name, next: name } : null,
      previous && previous.code !== code ? { field: "Code", previous: previous.code || "—", next: code || "—" } : null,
      previous && previous.description !== description
        ? { field: "Description", previous: previous.description || "—", next: description || "—" }
        : null,
    ].filter((item): item is { field: string; previous: string; next: string } => Boolean(item));
    appendAudit({
      actor,
      action: `Updated ${label.toLowerCase()}`,
      area: "structure",
      entity: name,
      changes,
    });
    emit();
    return { ok: true as const, id: existingId };
  }

  const unit: OrgStructureUnit = {
    id: slugId(name, kind),
    name,
    code,
    description,
    status: "active",
  };
  state = { ...state, [kind]: [...state[kind], unit] };
  appendAudit({
    actor,
    action: `Added ${label.toLowerCase()}`,
    area: "structure",
    entity: name,
    changes: [
      { field: "Status", previous: "—", next: "Active" },
      ...(code ? [{ field: "Code", previous: "—", next: code }] : []),
    ],
  });
  emit();
  return { ok: true as const, id: unit.id };
}

export function deactivateUnit(
  kind: OrgStructureKind,
  id: string,
  reassignments: { siteId: string; nextId: string | null }[],
  actor = "Enterprise user",
) {
  const unit = getUnit(kind, id);
  if (!unit || unit.status === "deactivated") return { ok: false as const, error: "This structure is already deactivated." };

  const affected = sitesAssignedTo(kind, id);
  const field = siteField(kind);
  const chosen = new Map(reassignments.map((item) => [item.siteId, item.nextId]));

  if (affected.length) {
    const missing = affected.filter((site) => !chosen.has(site.id));
    if (missing.length) {
      return { ok: false as const, error: "Reassign every affected site before deactivating." };
    }
    for (const site of affected) {
      const nextId = chosen.get(site.id) ?? null;
      if (nextId === id) {
        return { ok: false as const, error: "Choose a different assignment for each affected site." };
      }
      if (nextId && getUnit(kind, nextId)?.status !== "active") {
        return { ok: false as const, error: "Sites can only be moved to an active structure." };
      }
    }
  }

  const assignments = { ...state.assignments };
  for (const site of affected) {
    const current = assignments[site.id] ?? {};
    assignments[site.id] = { ...current, [field]: chosen.get(site.id) ?? null };
  }

  state = {
    ...state,
    assignments,
    [kind]: state[kind].map((item) => (item.id === id ? { ...item, status: "deactivated" as const } : item)),
  };
  const label = structureLabel(kind);
  appendAudit({
    actor,
    action: `Deactivated ${label.toLowerCase()}`,
    area: "structure",
    entity: unit.name,
    changes: [{ field: "Status", previous: "Active", next: "Deactivated" }],
  });
  for (const site of affected) {
    const nextId = chosen.get(site.id) ?? null;
    const nextUnit = nextId ? getUnit(kind, nextId) : null;
    appendAudit({
      actor,
      action: "Site reassigned",
      area: "sites",
      entity: site.name,
      detail: `${site.name} was moved after ${unit.name} was deactivated.`,
      changes: [{ field: label, previous: unit.name, next: nextUnit?.name ?? "Unassigned" }],
    });
  }
  emit();
  return { ok: true as const };
}

export function reactivateUnit(kind: OrgStructureKind, id: string, actor = "Enterprise user") {
  const unit = getUnit(kind, id);
  state = {
    ...state,
    [kind]: state[kind].map((item) => (item.id === id ? { ...item, status: "active" as const } : item)),
  };
  if (unit) {
    appendAudit({
      actor,
      action: `Reactivated ${structureLabel(kind).toLowerCase()}`,
      area: "structure",
      entity: unit.name,
      changes: [{ field: "Status", previous: "Deactivated", next: "Active" }],
    });
  }
  emit();
}

export function deleteUnit(kind: OrgStructureKind, id: string, actor = "Enterprise user") {
  const unit = getUnit(kind, id);
  if (!canDeleteUnit(kind, id)) {
    return { ok: false as const, error: "This structure has history or assigned sites. Deactivate it instead." };
  }
  state = { ...state, [kind]: state[kind].filter((item) => item.id !== id) };
  if (unit) {
    appendAudit({
      actor,
      action: `Deleted ${structureLabel(kind).toLowerCase()}`,
      area: "structure",
      entity: unit.name,
      detail: `${unit.name} was removed. It had no assigned sites and no historical collections.`,
      changes: [{ field: "Status", previous: "Active", next: "Deleted" }],
    });
  }
  emit();
  return { ok: true as const };
}

export function sitesHref(kind: OrgStructureKind, id: string) {
  const param = kind === "group" ? "group" : kind === "territory" ? "territory" : "cluster";
  return `/sites?${param}=${encodeURIComponent(id)}`;
}
