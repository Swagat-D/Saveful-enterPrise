import {
  getAuthProfile,
  getEnterpriseProfile,
  getEnterpriseStructure,
  getOrganisationSites,
  listAllOrganisationFoodListings,
  listEnterpriseClusters,
  listEnterpriseGroups,
  listEnterpriseInvites,
  listEnterpriseMembers,
  listEnterpriseTerritories,
  type ApiEnterpriseInvite,
  type ApiEnterpriseUser,
  type ApiSiteRow,
} from "@/lib/api";
import { replaceActivityFromListings } from "@/lib/activity";
import { applyOrganization, getOrganization } from "@/lib/organization";
import { replaceStructure } from "@/lib/orgStructure";
import { mapEnterpriseRole, scopeFromApi } from "@/lib/enterpriseRole";
import { replaceNetworkSites, replaceNetworkUnits } from "@/lib/network";
import { getSession, type SessionUser } from "@/lib/auth";
import { listUsers, replaceUsers } from "@/lib/users";
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

function memberToUser(row: ApiEnterpriseUser): DirectoryUser | null {
  const email = row.email?.trim() ?? "";
  const firstName = row.firstName?.trim() ?? "";
  const lastName = row.lastName?.trim() ?? "";
  const name = `${firstName} ${lastName}`.trim() || email;
  if (!email && !name && row.id == null) return null;
  const role = mapEnterpriseRole(row.role);
  return {
    id: String(row.id ?? email ?? name),
    firstName: firstName || name,
    lastName,
    name,
    email,
    mobile: row.mobile ?? "",
    role,
    scope: scopeFromApi(role, row.scopes),
    status: toStatus(row.status ?? "ACTIVE"),
    lastActiveAt: row.lastLoginAt ?? null,
    invitedAt: row.joinedAt ?? null,
    inviteToken: null,
  };
}

function asList<T>(payload: unknown, keys: string[]): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of keys) {
      if (Array.isArray(record[key])) return record[key] as T[];
    }
    const arrays = Object.values(record).filter(Array.isArray);
    if (arrays.length === 1) return arrays[0] as T[];
  }
  return [];
}

function sessionToUser(session: SessionUser): DirectoryUser {
  const parts = session.name.trim().split(/\s+/).filter(Boolean);
  return {
    id: session.id,
    firstName: parts[0] ?? session.name,
    lastName: parts.slice(1).join(" "),
    name: session.name,
    email: session.email,
    mobile: "",
    role: session.enterpriseRole ?? "enterprise_super_admin",
    scope: { enterprise: true },
    status: "active",
    lastActiveAt: null,
    invitedAt: null,
    inviteToken: null,
  };
}

function managerToUser(manager: NonNullable<ApiSiteRow["managers"]>[number], siteId: number): DirectoryUser | null {
  const email = manager.user?.email?.trim() ?? "";
  const firstName = manager.user?.firstName?.trim() ?? "";
  const lastName = manager.user?.lastName?.trim() ?? "";
  const name = `${firstName} ${lastName}`.trim() || email;
  if (!email && !name) return null;
  return {
    id: String(manager.userId),
    firstName: firstName || name,
    lastName,
    name: name || email,
    email,
    mobile: manager.user?.phoneNumber ?? "",
    role: "site_admin",
    scope: { siteIds: [String(siteId)] },
    status: "active",
    lastActiveAt: null,
    invitedAt: null,
    inviteToken: null,
  };
}

function inviteToUser(row: ApiEnterpriseInvite): DirectoryUser | null {
  const email = row.email?.trim() ?? "";
  const firstName = row.firstName?.trim() ?? "";
  const lastName = row.lastName?.trim() ?? "";
  const name = `${firstName} ${lastName}`.trim() || email;
  if (!email && !name) return null;
  const role = mapEnterpriseRole(row.role);
  return {
    id: `invite-${row.id ?? email}`,
    firstName: firstName || name,
    lastName,
    name,
    email,
    mobile: "",
    role,
    scope: scopeFromApi(role, row.scopes),
    status: "invited",
    lastActiveAt: null,
    invitedAt: row.invitationSentAt,
    inviteToken: null,
  };
}

function contactToUser(row: ApiSiteRow): DirectoryUser | null {
  const email = row.contactEmail && row.contactEmail !== "not provided" ? row.contactEmail.trim() : "";
  const name = row.contactName && row.contactName !== "not provided" ? row.contactName.trim() : "";
  if (!email && !name) return null;
  return {
    id: `contact-${row.id}`,
    firstName: name.split(/\s+/)[0] || name || email,
    lastName: name.split(/\s+/).slice(1).join(" "),
    name: name || email,
    email,
    mobile: row.phoneNumber && row.phoneNumber !== "not provided" ? row.phoneNumber : "",
    role: "site_admin",
    scope: { siteIds: [String(row.id)] },
    status: "active",
    lastActiveAt: null,
    invitedAt: null,
    inviteToken: null,
  };
}

export function siteFromApiRow(row: ApiSiteRow): OrganizationSite {
  return toSite(row);
}

function toSite(row: ApiSiteRow): OrganizationSite {
  const created = row.createdAt ?? null;
  const contactName = row.contactName && row.contactName !== "not provided" ? row.contactName : "";
  const manager = row.managers?.[0]?.user;
  const managerName = manager ? `${manager.firstName ?? ""} ${manager.lastName ?? ""}`.trim() : contactName;
  const managerEmail = manager?.email && manager.email !== "not provided" ? manager.email : "";
  const managerMobile = manager?.phoneNumber && manager.phoneNumber !== "not provided" ? manager.phoneNumber : "";
  const contactEmail = row.contactEmail && row.contactEmail !== "not provided" ? row.contactEmail : "";
  const contactMobile = row.phoneNumber && row.phoneNumber !== "not provided" ? row.phoneNumber : "";
  return {
    id: String(row.id),
    siteCode: row.siteCode || `SITE-${String(row.id).padStart(6, "0")}`,
    siteType: "branch",
    name: row.siteName,
    address: row.address,
    postCode: row.postcode ?? "",
    managerName,
    managerUserId: row.managers?.[0]?.userId != null ? String(row.managers[0].userId) : null,
    email: contactEmail || managerEmail,
    mobile: contactMobile || managerMobile,
    hasManager: Boolean(row.managers?.length || contactName || contactEmail || managerEmail),
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

function directoryFromLive(
  membersPayload: unknown,
  invitesPayload: unknown,
  siteRows: ApiSiteRow[],
  session?: SessionUser | null,
) {
  const members = asList<ApiEnterpriseUser>(membersPayload, ["users", "members", "data"]);
  const invites = asList<ApiEnterpriseInvite>(invitesPayload, ["invitations", "invites", "data"]);
  const fromSites = siteRows.flatMap((row) => [
    ...(row.managers ?? []).map((manager) => managerToUser(manager, row.id)),
    contactToUser(row),
  ]);
  const fromSession = session && session.portal !== "admin" ? [sessionToUser(session)] : [];

  const seen = new Set<string>();
  return [...members.map(memberToUser), ...invites.map(inviteToUser), ...fromSites, ...fromSession].filter(
    (user): user is DirectoryUser => {
      if (!user) return false;
      const key = (user.email || user.id).toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    },
  );
}

export async function refreshEnterpriseActivity(orgId?: string | number | null) {
  const resolved = orgId ?? getOrganization().organisationId;
  if (resolved == null || !/^\d+$/.test(String(resolved))) {
    const profile = await getAuthProfile().catch(() => null);
    const fallback = profile?.organisation?.id;
    if (fallback == null) return [];
    const rows = await listAllOrganisationFoodListings(fallback);
    replaceActivityFromListings(rows);
    return rows;
  }
  const rows = await listAllOrganisationFoodListings(resolved);
  replaceActivityFromListings(rows);
  return rows;
}

export async function refreshEnterpriseWorkspace(options?: { session?: SessionUser | null }) {
  const [profile, auth, sites, membersPayload, invitesPayload, structure, listedGroups, listedClusters, listedTerritories] =
    await Promise.all([
      getEnterpriseProfile().catch(() => null),
      getAuthProfile().catch(() => null),
      getOrganisationSites().catch(() => null),
      listEnterpriseMembers().catch(() => null),
      listEnterpriseInvites().catch(() => null),
      getEnterpriseStructure().catch(() => null),
      listEnterpriseGroups().catch(() => null),
      listEnterpriseClusters().catch(() => null),
      listEnterpriseTerritories().catch(() => null),
    ]);

  const siteRows = sites?.sites ?? (sites?.site ? [sites.site] : []);
  const session = options?.session ?? getSession();
  try {
    replaceUsers(directoryFromLive(membersPayload, invitesPayload, siteRows, session));
  } catch {
    if (session && session.portal !== "admin") {
      replaceUsers([sessionToUser(session)]);
    }
  }

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
      organisationId: auth?.organisation?.id != null ? String(auth.organisation.id) : getOrganization().organisationId,
      enterpriseId: profile.readOnly.enterpriseId,
      accountStatus: profile.readOnly.accountStatus === "ACTIVE" ? "Active" : "Active",
      contractStart: profile.readOnly.contractStartDate ?? "",
      contractEnd: profile.readOnly.contractEndDate ?? "",
      billingFrequency: profile.readOnly.billingFrequency ?? "",
      plan: profile.readOnly.enterprisePlan,
    });
  }

  replaceNetworkSites(siteRows.map(toSite));
  const organisationId = auth?.organisation?.id ?? getOrganization().organisationId;
  await refreshEnterpriseActivity(organisationId).catch(() => undefined);

  const groups =
    listedGroups?.map((group) => ({
      id: String(group.id),
      name: group.name,
      code: group.code ?? "",
      description: "",
      status: group.isActive === false ? ("deactivated" as const) : ("active" as const),
    })) ??
    structure?.groups.map((group) => ({
      id: String(group.id),
      name: group.name,
      code: group.code ?? "",
      description: "",
      status: group.isActive ? ("active" as const) : ("deactivated" as const),
    })) ??
    [];

  const clusters =
    listedClusters?.map((cluster) => ({
      id: String(cluster.id),
      name: cluster.name,
      code: cluster.code ?? "",
      description: "",
      status: cluster.isActive === false ? ("deactivated" as const) : ("active" as const),
      groupId: cluster.group?.id != null ? String(cluster.group.id) : undefined,
    })) ??
    structure?.groups.flatMap((group) =>
      group.clusters.map((cluster) => ({
        id: String(cluster.id),
        name: cluster.name,
        code: "",
        description: "",
        status: cluster.isActive ? ("active" as const) : ("deactivated" as const),
        groupId: String(group.id),
      })),
    ) ??
    [];

  const territories =
    listedTerritories?.map((territory) => ({
      id: String(territory.id),
      name: territory.name,
      code: territory.code ?? "",
      description: "",
      status: territory.isActive === false ? ("deactivated" as const) : ("active" as const),
    })) ??
    structure?.territories.map((territory) => ({
      id: String(territory.id),
      name: territory.name,
      code: territory.code ?? "",
      description: "",
      status: territory.isActive ? ("active" as const) : ("deactivated" as const),
    })) ??
    [];

  if (groups.length || clusters.length || territories.length) {
    replaceStructure({ group: groups, territory: territories, cluster: clusters });
    replaceNetworkUnits({
      groups: groups.map((group) => ({ id: group.id, name: group.name })),
      territories: territories.map((territory) => ({ id: territory.id, name: territory.name })),
      clusters: clusters.map((cluster) => ({ id: cluster.id, name: cluster.name })),
    });
  }

  return { profile, sites: siteRows, users: listUsers() };
}
