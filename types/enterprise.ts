export type SiteType = "head_office" | "branch";

export type ListingStatus =
  | "ACTIVE"
  | "PARTIAL"
  | "CLAIMED"
  | "COLLECTED"
  | "EXPIRED"
  | "CANCELLED";

export type FoodListingType = "HUMAN" | "ANIMAL" | "BOTH";

export type RecoveryPathway = "people" | "livestock" | "circular" | "bioenergy";

export type AttentionReason =
  | "never_activated"
  | "no_activity_30d"
  | "no_listings_in_period"
  | "setup_required";

export type SiteLifecycleStatus = "active" | "deactivated";

export type ActivityStatus =
  | "in_period"
  | "none_in_period"
  | "never_used"
  | "never_activated";

export type SiteSummaryKey = "total" | "active" | "no_recent" | "never_activated" | "deactivated";

export type PeriodKey = "7" | "30" | "90" | "all";

export type OrgStructureKind = "group" | "territory" | "cluster";

export type OrgUnitStatus = "active" | "deactivated";

export type OrgUnit = {
  id: string;
  name: string;
  code?: string;
  description?: string;
  status?: OrgUnitStatus;
};

export type OrganizationSnapshot = {
  groupId: string;
  groupName: string;
  territoryId: string;
  territoryName: string;
  clusterId: string;
  clusterName: string;
  siteId: string;
  siteName: string;
};

export type OrganizationSite = {
  id: string;
  siteCode: string;
  parentId?: string;
  siteType: SiteType;
  name: string;
  address: string;
  postCode: string;
  managerName: string;
  email: string;
  mobile: string;
  hasManager: boolean;
  isDefault: boolean;
  groupId?: string | null;
  territoryId?: string | null;
  clusterId?: string | null;
  status: SiteLifecycleStatus;
  createdAt?: string | null;
  activatedAt: string | null;
  lastActivityAt: string | null;
  lastListingAt: string | null;
  primaryContact?: string | null;
  collectionDays?: Weekday[];
  collectionFrom?: string;
  collectionTo?: string;
  collectionInstructions?: string;
  latitude?: number | null;
  longitude?: number | null;
};

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export type SurplusListing = {
  id: string;
  siteId: string;
  siteName: string;
  title: string;
  quantityKg: number;
  status: ListingStatus;
  audience: FoodListingType;
  pickupWindow: string;
};

export type ActivityListingStatus =
  | "published"
  | "claimed"
  | "driver_assigned"
  | "collected"
  | "completed"
  | "expired"
  | "cancelled";

export type ActivityCollectionStatus = "scheduled" | "in_progress" | "completed" | "cancelled";

export type ActivityListing = {
  id: string;
  code: string;
  siteId: string;
  siteName: string;
  groupId: string;
  groupName: string;
  territoryId: string;
  territoryName: string;
  clusterId: string;
  clusterName: string;
  food: string;
  category: string;
  pathway: RecoveryPathway;
  quantityKg: number;
  claimedKg: number;
  status: ActivityListingStatus;
  createdAt: string;
  pickupFrom: string;
  pickupTo: string;
  notes: string;
  collectionIds: string[];
};

export type ActivityCollection = {
  id: string;
  code: string;
  listingId: string;
  listingCode: string;
  siteId: string;
  siteName: string;
  groupId: string;
  groupName: string;
  territoryId: string;
  territoryName: string;
  clusterId: string;
  clusterName: string;
  food: string;
  pathway: RecoveryPathway;
  quantityKg: number;
  recipientName: string;
  driverName: string | null;
  confirmedBy: string | null;
  notes: string;
  status: ActivityCollectionStatus;
  occurredAt: string;
};

export type RecoveryTransaction = {
  id: string;
  occurredAt: string;
  kg: number;
  pathway: RecoveryPathway;
  recipientId: string;
  recipientName: string;
  snapshot: OrganizationSnapshot;
};

export type AccessScope = {
  groupIds?: string[] | null;
  territoryIds?: string[] | null;
  clusterIds?: string[] | null;
  siteIds?: string[] | null;
};

export type EnterpriseRole =
  | "enterprise_super_admin"
  | "enterprise_admin"
  | "group_admin"
  | "reporting"
  | "site_admin";

export type DirectoryUserStatus = "active" | "invited" | "deactivated";

export type UserAccessScope = {
  enterprise?: boolean;
  groupIds?: string[];
  territoryIds?: string[];
  clusterIds?: string[];
  siteIds?: string[];
};

export type DirectoryUser = {
  id: string;
  firstName: string;
  lastName: string;
  name: string;
  email: string;
  mobile: string;
  role: EnterpriseRole;
  scope: UserAccessScope;
  status: DirectoryUserStatus;
  lastActiveAt: string | null;
  invitedAt: string | null;
  inviteToken: string | null;
};

export type NetworkFilters = {
  groupId: string;
  territoryId: string;
  clusterId: string;
  siteId: string;
  period: PeriodKey;
};
