export type SiteType = "head_office" | "branch";

export type ListingStatus =
  | "ACTIVE"
  | "PARTIAL"
  | "CLAIMED"
  | "COLLECTED"
  | "EXPIRED"
  | "CANCELLED";

export type FoodListingType = "HUMAN" | "ANIMAL" | "BOTH";

export type OrganizationSite = {
  id: string;
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
