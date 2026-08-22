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

export type OrgUnit = {
  id: string;
  name: string;
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
  activatedAt: string | null;
  lastActivityAt: string | null;
  lastListingAt: string | null;
};

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

export type NetworkFilters = {
  groupId: string;
  territoryId: string;
  clusterId: string;
  siteId: string;
  period: PeriodKey;
};
