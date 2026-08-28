import {
  getEnterpriseProfile,
  getEnterpriseStructure,
  getOrganisationSites,
  listEnterpriseInvites,
  listEnterpriseMembers,
  type ApiEnterpriseInvite,
  type ApiEnterpriseUser,
  type ApiSiteRow,
} from "@/lib/api";
import { applyOrganization } from "@/lib/organization";
import { replaceStructure } from "@/lib/orgStructure";
import { mapEnterpriseRole, scopeFromApi } from "@/lib/enterpriseRole";
import { replaceNetworkSites, replaceNetworkUnits } from "@/lib/network";
import { replaceUsers } from "@/lib/users";
import type { DirectoryUser, DirectoryUserStatus, OrganizationSite, Weekday } from "@/types/enterprise";

const WEEKDAYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function toWeekdays(days?: string[]): Weekday[] | undefined {
  if (!days?.length) return undefined;
  return days.filter((day): day is Weekday => WEEKDAYS.includes(day as Weekday));
}

function toStatus(status: string): DirectoryUserStatus {
  const value = status.toUpperCase();
  if (value === "INVITED") return "invited";
  if (value === "DEACTIVATED") return "deactivated";
  return "active";
}

function memberToUser(row: ApiEnterpriseUser): DirectoryUser {
  const role = mapEnterpriseRole(row.role);
  return {
    id: String(row.id),
    firstName: row.firstName,
    lastName: row.lastName,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    mobile: row.mobile ?? "",
    role,
    scope: scopeFromApi(role, row.scopes),
    status: toStatus(row.status),
    lastActiveAt: row.lastLoginAt ?? null,
    invitedAt: row.joinedAt ?? null,
    inviteToken: null,
  };
}

function inviteToUser(row: ApiEnterpriseInvite): DirectoryUser {
  const role = mapEnterpriseRole(row.role);
  return {
    id: `invite-${row.id}`,
    firstName: row.firstName,
    lastName: row.lastName,
    name: `${row.firstName} ${row.lastName}`.trim(),
    email: row.email,
    mobile: "",
    role,
    scope: scopeFromApi(role, row.scopes),
    status: "invited",
    lastActiveAt: null,
    invitedAt: row.invitationSentAt,
    inviteToken: null,
  };
}

function toSite(row: ApiSiteRow): OrganizationSite {
  const created = row.createdAt ?? null;
  const contactName = row.contactName && row.contactName !== "not provided" ? row.contactName : "";
  const manager = row.managers?.[0]?.user;
  const managerName = manager ? `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() : contactName;
  return {
    id: String(row.id),
    siteCode: row.siteCode || `SITE-${String(row.id).padStart(6, "0")}`,
    siteType: "branch",
    name: row.siteName,
    address: row.address,
    postCode: row.postcode ?? "",
    managerName,
    email: row.contactEmail && row.contactEmail !== "not provided" ? row.contactEmail : manager?.email ?? "",
    mobile: row.phoneNumber && row.phoneNumber !== "not provided" ? row.phoneNumber : "",
    hasManager: Boolean(row.managers?.length || contactName),
    isDefault: false,
    groupId: row.groupId != null ? String(row.groupId) : null,
    clusterId: row.clusterId != null ? String(row.clusterId) : null,
    territoryId: row.territoryId != null ? String(row.territoryId) : null,
    status: row.isActive === false ? "deactivated" : "active",
    createdAt: created,
    activatedAt: row.isActive === false ? null : created,
    lastActivityAt: null,
    lastListingAt: null,
    primaryContact: contactName || null,
    collectionDays: toWeekdays(row.collectionDays),
    collectionFrom: row.collectionStartTime ?? undefined,
    collectionTo: row.collectionEndTime ?? undefined,
    collectionInstructions: row.collectionInstructions ?? undefined,
    latitude: row.latitude,
    longitude: row.longitude,
  };
}

export async function refreshEnterpriseWorkspace() {
  const [profile, sites, members, invites, structure] = await Promise.all([
    getEnterpriseProfile().catch(() => null),
    getOrganisationSites().catch(() => null),
    listEnterpriseMembers().catch(() => [] as ApiEnterpriseUser[]),
    listEnterpriseInvites().catch(() => [] as ApiEnterpriseInvite[]),
    getEnterpriseStructure().catch(() => null),
  ]);

  if (profile) {
    applyOrganization({
      name: profile.editable.enterpriseName,
      contactName: profile.editable.primaryContactName ?? "",
      contactEmail: profile.editable.primaryContactEmail ?? "",
      contactPhone: profile.editable.primaryContactPhone ?? "",
      logoDataUrl: profile.editable.logoUrl,
      country: profile.readOnly.country,
      timezone: profile.editable.timezone,
      currency: ["AUD", "NZD", "GBP", "USD", "EUR", "SGD"].includes(profile.readOnly.currency)
        ? (profile.readOnly.currency as "AUD" | "NZD" | "GBP" | "USD" | "EUR" | "SGD")
        : "AUD",
      units: profile.editable.measurementUnit === "IMPERIAL" ? "imperial" : "metric",
      enterpriseId: profile.readOnly.enterpriseId,
      accountStatus: profile.readOnly.accountStatus === "ACTIVE" ? "Active" : "Active",
      contractStart: profile.readOnly.contractStartDate ?? "",
      contractEnd: profile.readOnly.contractEndDate ?? "",
      billingFrequency: profile.readOnly.billingFrequency ?? "",
      plan: profile.readOnly.enterprisePlan,
    });
  }

  const siteRows = sites?.sites ?? (sites?.site ? [sites.site] : []);
  replaceNetworkSites(siteRows.map(toSite));

  const seen = new Set<string>();
  const users = [...members.map(memberToUser), ...invites.map(inviteToUser)].filter((user) => {
    const key = user.email.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  replaceUsers(users);

  if (structure) {
    const clusters = structure.groups.flatMap((group) =>
      group.clusters.map((cluster) => ({
        id: String(cluster.id),
        name: cluster.name,
        code: "",
        description: "",
        status: cluster.isActive ? ("active" as const) : ("deactivated" as const),
      })),
    );
    const groups = structure.groups.map((group) => ({
      id: String(group.id),
      name: group.name,
      code: "",
      description: "",
      status: group.isActive ? ("active" as const) : ("deactivated" as const),
    }));
    const territories = structure.territories.map((territory) => ({
      id: String(territory.id),
      name: territory.name,
      code: "",
      description: "",
      status: territory.isActive ? ("active" as const) : ("deactivated" as const),
    }));
    replaceStructure({ group: groups, territory: territories, cluster: clusters });
    replaceNetworkUnits({
      groups: groups.map((group) => ({ id: group.id, name: group.name })),
      territories: territories.map((territory) => ({ id: territory.id, name: territory.name })),
      clusters: clusters.map((cluster) => ({ id: cluster.id, name: cluster.name })),
    });
  }

  return { profile, sites: siteRows, users };
}
