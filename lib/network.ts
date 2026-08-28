import { DEMO_TODAY, toApiDate } from "@/lib/dates";
import type { OrgUnit, OrganizationSite, OrganizationSnapshot, RecoveryTransaction } from "@/types/enterprise";

export const demoGroups: OrgUnit[] = [];
export const demoTerritories: OrgUnit[] = [];
export const demoClusters: OrgUnit[] = [];
export const recoveryTransactions: RecoveryTransaction[] = [];
export const demoNetworkSites: OrganizationSite[] = [];

const groupName = (id?: string | null) =>
  id ? demoGroups.find((item) => item.id === id)?.name ?? id : "Unassigned";
const territoryName = (id?: string | null) =>
  id ? demoTerritories.find((item) => item.id === id)?.name ?? id : "Unassigned";
const clusterName = (id?: string | null) =>
  id ? demoClusters.find((item) => item.id === id)?.name ?? id : "Unassigned";

export function replaceNetworkSites(rows: OrganizationSite[]) {
  demoNetworkSites.splice(0, demoNetworkSites.length, ...rows);
}

export function replaceNetworkUnits(next: { groups?: OrgUnit[]; territories?: OrgUnit[]; clusters?: OrgUnit[] }) {
  if (next.groups) demoGroups.splice(0, demoGroups.length, ...next.groups);
  if (next.territories) demoTerritories.splice(0, demoTerritories.length, ...next.territories);
  if (next.clusters) demoClusters.splice(0, demoClusters.length, ...next.clusters);
}

export function lookupOrgNames() {
  return { groupName, territoryName, clusterName };
}

export function siteSnapshot(site: OrganizationSite): OrganizationSnapshot {
  return {
    groupId: site.groupId ?? "",
    groupName: groupName(site.groupId),
    territoryId: site.territoryId ?? "",
    territoryName: territoryName(site.territoryId),
    clusterId: site.clusterId ?? "",
    clusterName: clusterName(site.clusterId),
    siteId: site.id,
    siteName: site.name,
  };
}

export { toApiDate, DEMO_TODAY };
