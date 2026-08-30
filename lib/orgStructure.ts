"use client";

import { useSyncExternalStore } from "react";
import {
  ApiError,
  createEnterpriseCluster,
  createEnterpriseGroup,
  createEnterpriseTerritory,
  deleteEnterpriseCluster,
  deleteEnterpriseGroup,
  deleteEnterpriseTerritory,
  updateEnterpriseCluster,
  updateEnterpriseGroup,
  updateEnterpriseTerritory,
  updateOrganisationSite,
} from "@/lib/api";
import { appendAudit } from "@/lib/audit";
import { demoNetworkSites, recoveryTransactions } from "@/lib/network";
import type { OrgStructureKind, OrgUnitStatus, OrganizationSite } from "@/types/enterprise";

export type { OrgStructureKind };

export type OrgStructureUnit = {
  id: string;
  name: string;
  code: string;
  description: string;
  status: OrgUnitStatus;
  /** Present on clusters — backend create/update requires a parent group. */
  groupId?: string;
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
  groupId?: string;
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
  group: [],
  territory: [],
  cluster: [],
  assignments: {},
};

export function replaceStructure(next: Pick<State, "group" | "territory" | "cluster"> & { assignments?: Record<string, SiteOrgPatch> }) {
  state = {
    group: next.group,
    territory: next.territory,
    cluster: next.cluster,
    assignments: next.assignments ?? {},
  };
  emit();
}

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
  if (kind === "group" && state.cluster.some((cluster) => cluster.groupId === id)) {
    return false;
  }
  return !hasHistoricalData(kind, id) && sitesAssignedTo(kind, id).length === 0;
}

function asApiId(id: string) {
  const value = Number(id);
  return Number.isInteger(value) && value > 0 ? value : null;
}

function structureError(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback;
  return err instanceof Error ? err.message : fallback;
}

function optionalCode(code: string) {
  return code.trim() ? code.trim().toUpperCase() : undefined;
}

function createdRecordId(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const record = payload as Record<string, unknown>;
  if (typeof record.id === "number" && Number.isInteger(record.id) && record.id > 0) return record.id;
  for (const key of ["group", "cluster", "territory", "data"]) {
    const nested = createdRecordId(record[key]);
    if (nested) return nested;
  }
  return null;
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

export async function saveUnit(kind: OrgStructureKind, draft: StructureDraft, existingId?: string, actor = "Enterprise user") {
  const name = draft.name.trim();
  if (!name) return { ok: false as const, error: `${structureLabel(kind)} name is required.` };
  if (!uniqueName(kind, name, existingId)) {
    return { ok: false as const, error: `A ${structureLabel(kind).toLowerCase()} with this name already exists.` };
  }

  const label = structureLabel(kind);
  const code = draft.code.trim().toUpperCase();
  const description = draft.description.trim().slice(0, 250);

  try {
    const payload = {
      name,
      ...(optionalCode(code) ? { code: optionalCode(code) } : {}),
      ...(description ? { description } : {}),
    };

    if (existingId) {
      const id = asApiId(existingId);
      if (!id) return { ok: false as const, error: `This ${label.toLowerCase()} cannot be updated on the server.` };
      if (kind === "group") await updateEnterpriseGroup(id, payload);
      else if (kind === "territory") await updateEnterpriseTerritory(id, payload);
      else await updateEnterpriseCluster(id, payload);

      const previous = getUnit(kind, existingId);
      state = {
        ...state,
        [kind]: state[kind].map((unit) =>
          unit.id === existingId ? { ...unit, name, code, description } : unit,
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

    const created =
      kind === "group"
        ? await createEnterpriseGroup(payload)
        : kind === "territory"
          ? await createEnterpriseTerritory(payload)
          : await createEnterpriseCluster(payload);
    const createdId = createdRecordId(created);
    if (!createdId) {
      emit();
      return { ok: true as const, id: "" };
    }

    const unit: OrgStructureUnit = {
      id: String(createdId),
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
  } catch (err) {
    return { ok: false as const, error: structureError(err, `Could not save this ${label.toLowerCase()}.`) };
  }
}

export async function deactivateUnit(
  kind: OrgStructureKind,
  id: string,
  reassignments: { siteId: string; nextId: string | null }[],
  actor = "Enterprise user",
) {
  const unit = getUnit(kind, id);
  if (!unit || unit.status === "deactivated") return { ok: false as const, error: "This structure is already deactivated." };
  const unitId = asApiId(id);
  if (!unitId) return { ok: false as const, error: "This structure cannot be updated on the server." };

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

  try {
    for (const site of affected) {
      const siteId = asApiId(site.id);
      if (!siteId) continue;
      const nextId = chosen.get(site.id) ?? null;
      const nextApiId = nextId ? asApiId(nextId) : null;
      await updateOrganisationSite(siteId, { [field]: nextApiId });
    }
    const inactive = { isActive: false };
    if (kind === "group") await updateEnterpriseGroup(unitId, inactive);
    else if (kind === "territory") await updateEnterpriseTerritory(unitId, inactive);
    else await updateEnterpriseCluster(unitId, inactive);
  } catch (err) {
    return { ok: false as const, error: structureError(err, "Could not deactivate this structure.") };
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

export async function reactivateUnit(kind: OrgStructureKind, id: string, actor = "Enterprise user") {
  const unit = getUnit(kind, id);
  const unitId = asApiId(id);
  if (!unitId) return { ok: false as const, error: "This structure cannot be updated on the server." };
  try {
    const active = { isActive: true };
    if (kind === "group") await updateEnterpriseGroup(unitId, active);
    else if (kind === "territory") await updateEnterpriseTerritory(unitId, active);
    else await updateEnterpriseCluster(unitId, active);
  } catch (err) {
    return { ok: false as const, error: structureError(err, "Could not reactivate this structure.") };
  }
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
  return { ok: true as const };
}

export async function deleteUnit(kind: OrgStructureKind, id: string, actor = "Enterprise user") {
  const unit = getUnit(kind, id);
  if (kind === "group" && state.cluster.some((cluster) => cluster.groupId === id)) {
    return { ok: false as const, error: "This group still has clusters. Move or delete those clusters first." };
  }
  if (!canDeleteUnit(kind, id)) {
    return { ok: false as const, error: "This structure has history or assigned sites. Deactivate it instead." };
  }
  const unitId = asApiId(id);
  if (!unitId) return { ok: false as const, error: "This structure cannot be deleted on the server." };
  try {
    if (kind === "group") await deleteEnterpriseGroup(unitId);
    else if (kind === "territory") await deleteEnterpriseTerritory(unitId);
    else await deleteEnterpriseCluster(unitId);
  } catch (err) {
    return { ok: false as const, error: structureError(err, "Could not delete this structure.") };
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
