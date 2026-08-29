export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://s4b.saveful.app/api/v1"
).replace(/\/$/, "");

export const ACCESS_TOKEN_KEY = "enterprise_token";

export class ApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export type PlatformUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  platformRole: string;
};

export type AuthLoginResponse = {
  accessToken: string;
  user: PlatformUser;
  organisation?: {
    id: number;
    name: string;
  };
  role?: {
    orgRole?: string | null;
    enterpriseRole?: string | null;
    siteRole?: string | null;
  };
};

export type AuthProfileResponse = {
  user: PlatformUser & { phoneNumber?: string | null };
  organisation: { id: number; name: string } | null;
  role: {
    platformRole: string;
    orgRole: string | null;
    enterpriseRole?: string | null;
    siteRole: string | null;
  };
};

export type InvitationPreview = {
  email: string;
  firstName: string;
  lastName: string;
  enterprise: string;
  role: string;
  expiresAt: string;
  termsVersion: string;
};

export type EnterpriseProfileResponse = {
  editable: {
    enterpriseName: string;
    primaryContactName: string | null;
    primaryContactEmail: string | null;
    primaryContactPhone: string | null;
    logoUrl: string | null;
    timezone: string;
    measurementUnit: "METRIC" | "IMPERIAL";
  };
  readOnly: {
    enterpriseId: string;
    accountStatus: EnterpriseAccountStatus;
    country: string;
    currency: string;
    address: string | null;
    contractStartDate: string | null;
    contractEndDate: string | null;
    billingFrequency: string | null;
    contractStatus: string | null;
    enterprisePlan: string;
  };
};

export type ApiEnterpriseUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string | null;
  role: string;
  status: "ACTIVE" | "INVITED" | "DEACTIVATED" | string;
  lastLoginAt?: string | null;
  joinedAt?: string | null;
  scopes?: Array<{
    scopeType: string;
    scopeId: number | null;
    name?: string | null;
  }>;
};

export type ApiEnterpriseInvite = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: "INVITED" | string;
  invitationSentAt: string;
  expiresAt: string;
  scopes?: Array<{
    scopeType: string;
    scopeId: number | null;
    name?: string | null;
  }>;
};

export type ApiSiteRow = {
  id: number;
  siteName: string;
  siteCode?: string | null;
  address: string;
  postcode?: string | null;
  contactName?: string;
  contactEmail?: string;
  phoneNumber?: string;
  isActive?: boolean;
  createdAt?: string;
  latitude?: number | null;
  longitude?: number | null;
  collectionDays?: string[];
  collectionStartTime?: string | null;
  collectionEndTime?: string | null;
  collectionInstructions?: string | null;
  groupId?: number | null;
  clusterId?: number | null;
  territoryId?: number | null;
  managers?: Array<{
    userId: number;
    user?: { firstName?: string; lastName?: string; email?: string };
  }>;
};

export type CreateOrganisationSiteInput = {
  siteName: string;
  address: string;
  postcode?: string;
  contactName?: string;
  contactEmail?: string;
  phoneNumber?: string;
  latitude: number;
  longitude: number;
  collectionDays?: string[];
  collectionStartTime?: string;
  collectionEndTime?: string;
  collectionInstructions?: string;
  groupId?: number | null;
  clusterId?: number | null;
  territoryId?: number | null;
};

export type CreatedOrganisationSite = {
  message: string;
  site: ApiSiteRow;
};

export function createOrganisationSite(input: CreateOrganisationSiteInput) {
  return apiFetch<CreatedOrganisationSite>("/sites", {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function updateOrganisationSite(siteId: number, input: Partial<CreateOrganisationSiteInput>) {
  return apiFetch<CreatedOrganisationSite>(`/sites/${siteId}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function inviteEnterpriseUser(input: {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  role: string;
  siteAdminForSiteId?: number;
  scopes?: Array<{ scopeType: string; scopeId?: number | null }>;
}) {
  return apiFetch<{ message: string; invitation: { id: number; email: string; status: string } }>(
    "/enterprise/users",
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    },
  );
}

export function assignExistingSiteAdmin(siteId: number, userId: number) {
  return apiFetch<{ message: string }>(`/sites/${siteId}/assign-admin`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId }),
  });
}

export function createAdminOrganisationSite(organisationId: string | number, input: CreateOrganisationSiteInput) {
  return apiFetch<CreatedOrganisationSite>(`/admin/enterprise/${organisationId}/sites`, {
    method: "POST",
    auth: true,
    body: JSON.stringify(input),
  });
}

export function inviteAdminEnterpriseUser(
  organisationId: string | number,
  input: {
    firstName: string;
    lastName: string;
    email: string;
    mobile?: string;
    role: string;
    siteAdminForSiteId?: number;
    scopes?: Array<{ scopeType: string; scopeId?: number | null }>;
  },
) {
  return apiFetch<{ message: string; invitation: { id: number; email: string; status: string } }>(
    `/admin/enterprise/${organisationId}/users`,
    {
      method: "POST",
      auth: true,
      body: JSON.stringify(input),
    },
  );
}

export function assignAdminSiteAdmin(organisationId: string | number, siteId: number, userId: number) {
  return apiFetch<{ message: string }>(`/admin/enterprise/${organisationId}/sites/${siteId}/assign-admin`, {
    method: "POST",
    auth: true,
    body: JSON.stringify({ userId }),
  });
}

export function getAdminEnterpriseStructure(organisationId: string | number) {
  return apiFetch<EnterpriseStructureResponse>(`/admin/enterprise/${organisationId}/structure`, { auth: true });
}

export type AdminApiSiteRow = {
  id: number;
  organisationId: number;
  organisationName: string;
  enterpriseId?: string | null;
  siteName: string;
  siteCode?: string | null;
  address: string;
  isActive: boolean;
  createdAt?: string | null;
  activatedAt?: string | null;
  lastActivityAt?: string | null;
  groupId?: number | null;
  groupName?: string | null;
  clusterId?: number | null;
  clusterName?: string | null;
  territoryId?: number | null;
  territoryName?: string | null;
};

export async function listAdminSites() {
  try {
    return await apiFetch<{ sites: AdminApiSiteRow[] }>("/admin/sites", { auth: true });
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return apiFetch<{ sites: AdminApiSiteRow[] }>("/admin/enterprise/sites", { auth: true });
    }
    throw error;
  }
}

export type OrganisationSitesResponse = {
  sites?: ApiSiteRow[];
  site?: ApiSiteRow;
  organisation?: { id: number; name: string; logoUrl?: string | null };
};

export type EnterpriseStructureResponse = {
  groups: Array<{
    id: number;
    name: string;
    isActive: boolean;
    clusters: Array<{ id: number; name: string; isActive: boolean; siteCount: number }>;
  }>;
  territories: Array<{ id: number; name: string; isActive: boolean; siteCount: number }>;
};

type ApiFetchOptions = RequestInit & {
  auth?: boolean;
};

function messageFromBody(body: unknown, fallback: string) {
  if (!body || typeof body !== "object") return fallback;
  const message = (body as { message?: unknown }).message;
  if (Array.isArray(message)) {
    const joined = message.filter((item) => typeof item === "string" && item.trim()).join(". ");
    return joined || fallback;
  }
  if (typeof message === "string" && message.trim()) return message;
  return fallback;
}

export function getAccessToken() {
  if (typeof window === "undefined") return null;
  const token = window.localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token || token === "dev-session") return null;
  return token;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { auth = false, headers, ...rest } = options;
  const nextHeaders = new Headers(headers);
  if (rest.body && !(rest.body instanceof FormData) && !nextHeaders.has("Content-Type")) {
    nextHeaders.set("Content-Type", "application/json");
  }
  if (auth) {
    const token = getAccessToken();
    if (token) nextHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`, {
      ...rest,
      headers: nextHeaders,
    });
  } catch {
    throw new ApiError("Unable to reach Saveful. Check your connection and try again.", 0);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body && typeof body === "object" && typeof (body as { error?: unknown }).error === "string"
      ? (body as { error: string }).error
      : undefined;
    throw new ApiError(messageFromBody(body, `Request failed (${response.status})`), response.status, code);
  }
  return body as T;
}

export function loginWithPassword(email: string, password: string) {
  return apiFetch<AuthLoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      password,
    }),
  });
}

export function registerPlatformAdmin(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}) {
  return apiFetch<{ message: string; userId: number }>("/auth/register/platform-admin", {
    method: "POST",
    body: JSON.stringify({
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      email: input.email.trim().toLowerCase(),
      password: input.password,
    }),
  });
}

export type EnterpriseAccountStatus = "PENDING" | "ACTIVE" | "SUSPENDED" | "CLOSED";
export type MeasurementUnit = "METRIC" | "IMPERIAL";
export type ApiRegion = "AU" | "IN" | "US";

export type ProvisionEnterpriseInput = {
  enterpriseName: string;
  address: string;
  country: string;
  timezone: string;
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminMobile?: string;
  enterpriseId?: string;
  currency?: string;
  measurementUnit?: MeasurementUnit;
  region?: ApiRegion;
  logoUrl?: string;
};

export type ProvisionEnterpriseResponse = {
  message: string;
  organisationId: number;
  enterpriseId: string;
  accountStatus: EnterpriseAccountStatus;
  nextStep?: string;
};

export type EnterpriseListItem = {
  organisationId: number;
  enterpriseId: string;
  name: string;
  accountStatus: EnterpriseAccountStatus;
  country: string;
  currency: string;
  sites: number;
  users: number;
  lastLoginAt?: string | null;
  createdAt?: string | null;
  contract: {
    organisationId: number;
    status: string;
    startDate: string;
    endDate: string | null;
    billingFrequency: string;
  } | null;
};

function provisionFields(input: ProvisionEnterpriseInput) {
  return {
    enterpriseName: input.enterpriseName.trim(),
    address: input.address.trim(),
    country: input.country.trim().toUpperCase(),
    timezone: input.timezone.trim(),
    adminFirstName: input.adminFirstName.trim(),
    adminLastName: input.adminLastName.trim(),
    adminEmail: input.adminEmail.trim().toLowerCase(),
    ...(input.adminMobile?.trim() ? { adminMobile: input.adminMobile.trim() } : {}),
    ...(input.currency?.trim() ? { currency: input.currency.trim().toUpperCase() } : {}),
    ...(input.measurementUnit ? { measurementUnit: input.measurementUnit } : {}),
    ...(input.region ? { region: input.region } : {}),
    ...(input.logoUrl?.trim() ? { logoUrl: input.logoUrl.trim() } : {}),
  };
}

export function provisionEnterprise(input: ProvisionEnterpriseInput & { logoFile?: File | null }) {
  const fields = provisionFields(input);
  if (input.logoFile) {
    const body = new FormData();
    for (const [key, value] of Object.entries(fields)) {
      if (value) body.append(key, value);
    }
    body.append("logo", input.logoFile);
    return apiFetch<ProvisionEnterpriseResponse>("/admin/enterprise/provision", {
      method: "POST",
      auth: true,
      body,
    });
  }
  return apiFetch<ProvisionEnterpriseResponse>("/admin/enterprise/provision", {
    method: "POST",
    auth: true,
    body: JSON.stringify(fields),
  });
}

export function listEnterprises() {
  return apiFetch<EnterpriseListItem[]>("/admin/enterprise", { auth: true });
}

export type EnterpriseMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string | null;
  role: string;
  roleLabel?: string;
  status: "ACTIVE" | "INVITED" | "DEACTIVATED" | string;
  lastLoginAt?: string | null;
  joinedAt?: string | null;
};

export type EnterpriseInviteRow = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  roleLabel?: string;
  status: "INVITED" | string;
  invitationSentAt?: string;
  expiresAt?: string;
};

export type EnterpriseDetail = {
  organisationId: number;
  enterpriseId: string;
  name: string;
  address: string | null;
  accountStatus: EnterpriseAccountStatus;
  country: string;
  timezone: string;
  currency: string;
  measurementUnit: MeasurementUnit;
  primaryContactName: string | null;
  primaryContactEmail: string | null;
  primaryContactPhone: string | null;
  logoUrl: string | null;
  createdAt?: string;
  contract: EnterpriseListItem["contract"];
  pendingInvitations: number;
  users?: EnterpriseMember[];
  invitations?: EnterpriseInviteRow[];
};

export function getEnterprise(organisationId: string | number) {
  return apiFetch<EnterpriseDetail>(`/admin/enterprise/${organisationId}`, { auth: true });
}

export function listAdminEnterpriseUsers(organisationId: string | number) {
  return apiFetch<{ users: EnterpriseMember[] }>(`/admin/enterprise/${organisationId}/users`, { auth: true });
}

export type AdminNetworkUser = EnterpriseMember & {
  organisationId: number;
  organisationName: string;
  enterpriseId?: string | null;
};

export type AdminNetworkInvite = EnterpriseInviteRow & {
  organisationId: number;
  organisationName: string;
  enterpriseId?: string | null;
};

export function listAdminNetworkUsers() {
  return apiFetch<{ users: AdminNetworkUser[]; invitations: AdminNetworkInvite[] }>("/admin/enterprise/users", {
    auth: true,
  });
}

export function uploadEnterpriseLogo(file: File) {
  const body = new FormData();
  body.append("logo", file);
  return apiFetch<{ logoUrl: string }>("/admin/enterprise/logo", {
    method: "POST",
    auth: true,
    body,
  });
}

export function describeInvitation(token: string) {
  return apiFetch<InvitationPreview>(`/enterprise/invitations/${encodeURIComponent(token)}`);
}

export function acceptInvitation(token: string, input: { password: string; acceptTerms: boolean }) {
  return apiFetch<{ message: string; userId: number; email: string; enterprise: string; role: string }>(
    `/enterprise/invitations/${encodeURIComponent(token)}/accept`,
    {
      method: "POST",
      body: JSON.stringify({
        password: input.password,
        acceptTerms: input.acceptTerms,
      }),
    },
  );
}

export function getAuthProfile() {
  return apiFetch<AuthProfileResponse>("/auth/profile", { auth: true });
}

export function getEnterpriseProfile() {
  return apiFetch<EnterpriseProfileResponse>("/enterprise/profile", { auth: true });
}

export function listEnterpriseMembers() {
  return apiFetch<ApiEnterpriseUser[]>("/enterprise/users", { auth: true });
}

export function listEnterpriseInvites() {
  return apiFetch<ApiEnterpriseInvite[]>("/enterprise/invites", { auth: true });
}

export function getOrganisationSites() {
  return apiFetch<OrganisationSitesResponse>("/sites/organisation", { auth: true });
}

export function getEnterpriseStructure() {
  return apiFetch<EnterpriseStructureResponse>("/enterprise/structure", { auth: true });
}
