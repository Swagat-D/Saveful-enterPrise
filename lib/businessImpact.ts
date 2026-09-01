import { ApiError } from "@/lib/api";
import { businessFetch, getBusinessOrganisation } from "@/lib/businessApi";
import { IMPACT } from "@/lib/impact";
import type { BusinessUser, Entitlements } from "@/lib/businessTypes";
import { isVirtualHqSiteId } from "@/lib/businessHqSite";

export type ImpactPeriod = "week" | "month" | "year" | "lifetime" | "range";
export type ChartPeriod = Exclude<ImpactPeriod, "lifetime" | "range">;

export type ImpactFilterMode = "all_time" | "custom";

export type ImpactFilter = {
  mode: ImpactFilterMode;
  startDate?: string;
  endDate?: string;
};

export type ImpactDateRange = {
  startDate: string;
  endDate: string;
};

export type ImpactFetchOptions = {
  orgId?: number | null;
  preferOrgScope?: boolean;
};

export type ImpactTotals = {
  redistributedKg: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  totalFoodSavedUsd: number;
  collectionsCompleted: number;
  partnersSupported: number;
  forPeople: { kg: number; percent: number };
  forAnimal: { kg: number; percent: number };
  ratingAvg: number | null;
  ratingCount: number;
};

export type ImpactChartPoint = {
  label: string;
  kg: number;
};

export type SiteImpactResponse = {
  siteId: number;
  organisationId: number;
  organisationName: string;
  organizationType: string;
  mode: "DONOR" | "RECEIVER";
  period: ImpactPeriod | "range";
  rangeStart: string | null;
  rangeEnd: string;
  totals: ImpactTotals;
  chart: ImpactChartPoint[];
};

export type ImpactDisplayStats = {
  redistributedKg: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  foodSavedMoney: number;
  collectionsCompleted: number;
  partnersSupported: number;
  peopleKg: number;
  animalKg: number;
  peoplePercent: number;
  animalPercent: number;
  rating: number | null;
  ratingCount: number;
  mode: "DONOR" | "RECEIVER";
};

export type TopFoodItem = {
  rank: number;
  foodName: string;
  unit: string;
  category: string | null;
  totalKg: number;
  peopleKg?: number;
  animalKg?: number;
  peoplePercent?: number;
  animalPercent?: number;
  co2AvoidedKg: number;
  mealsCreated: number;
  totalFoodSavedUsd: number;
};

export type RecipientFoodItem = {
  foodName: string;
  category: string | null;
  unit?: string;
  totalKg: number;
};

export type ImpactRecipient = {
  rank: number;
  organisationId: number;
  name: string;
  organizationType?: string | null;
  logoUrl?: string | null;
  collections: number;
  totalKg: number;
  peopleKg?: number;
  animalKg?: number;
  sharePercent?: number;
  mealsCreated?: number;
  co2AvoidedKg?: number;
  totalFoodSavedUsd?: number;
  firstCollectionAt?: string | null;
  lastCollectionAt?: string | null;
  foods?: RecipientFoodItem[];
};

export type RecipientFoodRow = {
  name: string;
  category: string | null;
  totalKg: number;
};

export type RecipientRow = {
  key: string;
  rank: number;
  organisationId: number | null;
  name: string;
  kind: "people" | "animals" | "unknown";
  logoUrl: string | null;
  collections: number;
  totalKg: number;
  peopleKg: number;
  animalKg: number;
  sharePercent: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  savedUsd: number;
  firstCollectionAt: string | null;
  lastCollectionAt: string | null;
  foods: RecipientFoodRow[];
};

export const EMPTY_IMPACT_STATS: ImpactDisplayStats = {
  redistributedKg: 0,
  mealsCreated: 0,
  co2AvoidedKg: 0,
  foodSavedMoney: 0,
  collectionsCompleted: 0,
  partnersSupported: 0,
  peopleKg: 0,
  animalKg: 0,
  peoplePercent: 0,
  animalPercent: 0,
  rating: null,
  ratingCount: 0,
  mode: "DONOR",
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function foodSavedUsdFromKg(kg: number) {
  const safe = Number.isFinite(kg) && kg > 0 ? kg : 0;
  return round2(safe * IMPACT.FOOD_VALUE_PER_KG);
}

function rangeQuery(range?: Partial<ImpactDateRange>) {
  if (!range?.startDate || !range?.endDate) return "";
  return `?startDate=${encodeURIComponent(range.startDate)}&endDate=${encodeURIComponent(range.endDate)}`;
}

export function toApiDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(isoDate?: string) {
  if (!isoDate) return "Select";
  const [y, m, d] = isoDate.split("-").map(Number);
  if (!y || !m || !d) return "Select";
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function presetRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { startDate: toApiDate(start), endDate: toApiDate(end) };
}

export function isPresetActive(filter: ImpactFilter, days: number) {
  if (filter.mode !== "custom") return false;
  const range = presetRange(days);
  return filter.startDate === range.startDate && filter.endDate === range.endDate;
}

export function rangeParamsFromFilter(filter: ImpactFilter): Partial<ImpactDateRange> | undefined {
  if (filter.mode === "custom" && filter.startDate && filter.endDate) {
    return { startDate: filter.startDate, endDate: filter.endDate };
  }
  return undefined;
}

export function filterLabel(filter: ImpactFilter) {
  return filter.mode === "all_time"
    ? "All time"
    : `${formatDisplayDate(filter.startDate)} → ${formatDisplayDate(filter.endDate)}`;
}

export function getSiteImpact(siteId: number, period: Exclude<ImpactPeriod, "range"> = "lifetime") {
  return businessFetch<SiteImpactResponse>(`/impact/sites/${siteId}?period=${period}`, {
    auth: true,
    optional: true,
  });
}

export function getOrgImpact(orgId: number, period: Exclude<ImpactPeriod, "range"> = "lifetime") {
  return businessFetch<SiteImpactResponse>(`/impact/organisations/${orgId}?period=${period}`, {
    auth: true,
    optional: true,
  });
}

export function getSiteImpactByRange(siteId: number, range: ImpactDateRange) {
  return businessFetch<SiteImpactResponse>(
    `/impact/sites/${siteId}/range${rangeQuery(range)}`,
    { auth: true, optional: true },
  );
}

export function getOrgImpactByRange(orgId: number, range: ImpactDateRange) {
  return businessFetch<SiteImpactResponse>(
    `/impact/organisations/${orgId}/range${rangeQuery(range)}`,
    { auth: true, optional: true },
  );
}

export function getOrgTopFoods(orgId: number, range?: Partial<ImpactDateRange>) {
  return businessFetch<{ topFoods?: TopFoodItem[] }>(
    `/impact/organisations/${orgId}/top-foods${rangeQuery(range)}`,
    { auth: true, optional: true },
  );
}

export function getSiteTopFoods(siteId: number, range?: Partial<ImpactDateRange>) {
  return businessFetch<{ topFoods?: TopFoodItem[] }>(
    `/impact/sites/${siteId}/top-foods${rangeQuery(range)}`,
    { auth: true, optional: true },
  );
}

export function getOrgRecipients(orgId: number, range?: Partial<ImpactDateRange>) {
  return businessFetch<{ recipients?: ImpactRecipient[] }>(
    `/impact/organisations/${orgId}/recipients${rangeQuery(range)}`,
    { auth: true, optional: true },
  );
}

export function getSiteRecipients(siteId: number, range?: Partial<ImpactDateRange>) {
  return businessFetch<{ recipients?: ImpactRecipient[] }>(
    `/impact/sites/${siteId}/recipients${rangeQuery(range)}`,
    { auth: true, optional: true },
  );
}

export function unwrapTopFoods(payload: unknown): TopFoodItem[] {
  const root = (payload as { data?: unknown })?.data ?? payload;
  const list =
    (root as { topFoods?: unknown })?.topFoods ??
    (root as { data?: { topFoods?: unknown } })?.data?.topFoods ??
    (root as { foods?: unknown })?.foods;
  return Array.isArray(list) ? (list as TopFoodItem[]) : [];
}

function unwrapRecipients(payload: unknown): ImpactRecipient[] {
  const root = (payload as { data?: unknown })?.data ?? payload;
  const list =
    (root as { recipients?: unknown })?.recipients ??
    (root as { data?: { recipients?: unknown } })?.data?.recipients ??
    (root as { partners?: unknown })?.partners;
  return Array.isArray(list) ? (list as ImpactRecipient[]) : [];
}

const CHARITY_TYPES = ["CHARITY", "CHARITY_SINGLE", "CHARITY_MULTI"];
const ANIMAL_TYPES = ["FARMER_CONSUMER"];

function recipientKind(recipient: ImpactRecipient): RecipientRow["kind"] {
  const type = String(recipient.organizationType ?? "").toUpperCase();
  if (CHARITY_TYPES.includes(type)) return "people";
  if (ANIMAL_TYPES.includes(type)) return "animals";
  return "unknown";
}

function num(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toFoodRows(foods: RecipientFoodItem[] | undefined): RecipientFoodRow[] {
  if (!Array.isArray(foods)) return [];
  return foods
    .map((food) => ({
      name: food.foodName?.trim() || food.category?.trim() || "Food",
      category: food.category?.trim() || null,
      totalKg: round2(num(food.totalKg)),
    }))
    .filter((food) => food.totalKg > 0)
    .sort((a, b) => b.totalKg - a.totalKg);
}

export function toRecipientRows(recipients: ImpactRecipient[]): RecipientRow[] {
  const grandTotal = recipients.reduce((sum, row) => sum + num(row.totalKg), 0);
  return recipients
    .map((recipient, index) => {
      const totalKg = round2(num(recipient.totalKg));
      const kind = recipientKind(recipient);
      let peopleKg = round2(num(recipient.peopleKg));
      let animalKg = round2(num(recipient.animalKg));
      if (peopleKg + animalKg <= 0 && totalKg > 0) {
        if (kind === "animals") animalKg = totalKg;
        else peopleKg = totalKg;
      }
      return {
        key: `${recipient.organisationId ?? index}:${recipient.name ?? ""}`,
        rank: recipient.rank || index + 1,
        organisationId: recipient.organisationId ?? null,
        name: recipient.name?.trim() || "Partner organisation",
        kind,
        logoUrl: recipient.logoUrl ?? null,
        collections: Math.max(0, Math.round(num(recipient.collections))),
        totalKg,
        peopleKg,
        animalKg,
        sharePercent:
          recipient.sharePercent != null
            ? round1(num(recipient.sharePercent))
            : grandTotal > 0
              ? round1((totalKg / grandTotal) * 100)
              : 0,
        mealsCreated:
          recipient.mealsCreated != null
            ? Math.round(num(recipient.mealsCreated))
            : Math.round(peopleKg / IMPACT.MEAL_WEIGHT_KG),
        co2AvoidedKg:
          recipient.co2AvoidedKg != null
            ? round2(num(recipient.co2AvoidedKg))
            : round2(totalKg * IMPACT.CO2_PER_KG),
        savedUsd: foodSavedUsdFromKg(totalKg),
        firstCollectionAt: recipient.firstCollectionAt ?? null,
        lastCollectionAt: recipient.lastCollectionAt ?? null,
        foods: toFoodRows(recipient.foods),
      };
    })
    .sort((a, b) => b.totalKg - a.totalKg)
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

export function isRecipientsUnsupported(error: unknown) {
  return error instanceof ApiError && (error.status === 404 || error.status === 501);
}

export async function fetchRecipientRows(params: {
  filter: ImpactFilter;
  siteId?: number | null;
  orgId?: number | null;
}) {
  const { filter, siteId = null, orgId = null } = params;
  if (siteId == null && orgId == null) return [];
  const range = rangeParamsFromFilter(filter);
  try {
    const res =
      siteId != null
        ? await getSiteRecipients(siteId, range)
        : await getOrgRecipients(Number(orgId), range);
    return toRecipientRows(unwrapRecipients(res));
  } catch (error) {
    if (isRecipientsUnsupported(error)) return [];
    throw error;
  }
}

export function formatCollectionDate(iso: string | null) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function foodLabel(food: TopFoodItem) {
  return food.foodName?.trim() || food.category?.trim() || "Food";
}

export function foodKey(food: TopFoodItem) {
  return `${food.rank}:${food.foodName}:${food.category ?? ""}`;
}

export function resolveFoodSplit(
  food: TopFoodItem | null,
  fallbackPeoplePercent: number,
  fallbackAnimalPercent: number,
) {
  const total = food?.totalKg ?? 0;
  if (!food || total <= 0) {
    return { peopleKg: 0, animalKg: 0, peoplePercent: 0, animalPercent: 0 };
  }

  const hasPerFoodSplit =
    food.peopleKg != null ||
    food.animalKg != null ||
    food.peoplePercent != null ||
    food.animalPercent != null;

  if (hasPerFoodSplit) {
    let peopleKg =
      food.peopleKg != null
        ? Number(food.peopleKg)
        : round2((total * Number(food.peoplePercent ?? 0)) / 100);
    let animalKg =
      food.animalKg != null
        ? Number(food.animalKg)
        : round2((total * Number(food.animalPercent ?? 0)) / 100);
    if (peopleKg + animalKg <= 0) {
      peopleKg = total;
      animalKg = 0;
    }
    return {
      peopleKg: round2(peopleKg),
      animalKg: round2(animalKg),
      peoplePercent: round1((peopleKg / total) * 100),
      animalPercent: round1((animalKg / total) * 100),
    };
  }

  const peoplePct = Math.max(0, Math.min(100, fallbackPeoplePercent));
  const animalPct = Math.max(0, Math.min(100, fallbackAnimalPercent));
  const pctSum = peoplePct + animalPct;
  const safePeople = pctSum > 0 ? peoplePct : 100;
  const safeAnimal = pctSum > 0 ? animalPct : 0;
  return {
    peopleKg: round2((total * safePeople) / 100),
    animalKg: round2((total * safeAnimal) / 100),
    peoplePercent: round1(safePeople),
    animalPercent: round1(safeAnimal),
  };
}

function emptyTotals(): ImpactTotals {
  return {
    redistributedKg: 0,
    mealsCreated: 0,
    co2AvoidedKg: 0,
    totalFoodSavedUsd: 0,
    collectionsCompleted: 0,
    partnersSupported: 0,
    forPeople: { kg: 0, percent: 0 },
    forAnimal: { kg: 0, percent: 0 },
    ratingAvg: null,
    ratingCount: 0,
  };
}

function mergeTotals(acc: ImpactTotals, next: ImpactTotals): ImpactTotals {
  const redistributedKg = round2(acc.redistributedKg + next.redistributedKg);
  const forPeopleKg = round2(acc.forPeople.kg + next.forPeople.kg);
  const forAnimalKg = round2(acc.forAnimal.kg + next.forAnimal.kg);
  const ratingCount = acc.ratingCount + next.ratingCount;
  const ratingSum =
    (acc.ratingAvg ?? 0) * acc.ratingCount + (next.ratingAvg ?? 0) * next.ratingCount;

  return {
    redistributedKg,
    mealsCreated: Math.round(acc.mealsCreated + next.mealsCreated),
    co2AvoidedKg: round2(acc.co2AvoidedKg + next.co2AvoidedKg),
    totalFoodSavedUsd: round2(acc.totalFoodSavedUsd + next.totalFoodSavedUsd),
    collectionsCompleted: acc.collectionsCompleted + next.collectionsCompleted,
    partnersSupported: acc.partnersSupported + next.partnersSupported,
    forPeople: {
      kg: forPeopleKg,
      percent: redistributedKg > 0 ? round1((forPeopleKg / redistributedKg) * 100) : 0,
    },
    forAnimal: {
      kg: forAnimalKg,
      percent: redistributedKg > 0 ? round1((forAnimalKg / redistributedKg) * 100) : 0,
    },
    ratingAvg: ratingCount > 0 ? round1(ratingSum / ratingCount) : null,
    ratingCount,
  };
}

function mergeCharts(responses: SiteImpactResponse[]): ImpactChartPoint[] {
  const bucketMap = new Map<string, number>();
  const labelOrder: string[] = [];
  for (const response of responses) {
    for (const point of response.chart ?? []) {
      const label = String(point?.label ?? "");
      if (!label) continue;
      const kg = Number(point?.kg);
      const safeKg = Number.isFinite(kg) ? Math.max(0, kg) : 0;
      if (!bucketMap.has(label)) labelOrder.push(label);
      bucketMap.set(label, round2((bucketMap.get(label) ?? 0) + safeKg));
    }
  }
  return labelOrder.map((label) => ({ label, kg: bucketMap.get(label) ?? 0 }));
}

export function aggregateSiteImpacts(responses: SiteImpactResponse[]): SiteImpactResponse | null {
  if (responses.length === 0) return null;
  if (responses.length === 1) return responses[0];
  const first = responses[0];
  return {
    ...first,
    siteId: 0,
    totals: responses.reduce((acc, response) => mergeTotals(acc, response.totals), emptyTotals()),
    chart: mergeCharts(responses),
  };
}

export function mapImpactToDisplayStats(impact: SiteImpactResponse | null): ImpactDisplayStats {
  if (!impact) return EMPTY_IMPACT_STATS;
  const { totals, mode } = impact;
  return {
    redistributedKg: totals.redistributedKg,
    mealsCreated: totals.mealsCreated,
    co2AvoidedKg: totals.co2AvoidedKg,
    foodSavedMoney: foodSavedUsdFromKg(totals.redistributedKg),
    collectionsCompleted: totals.collectionsCompleted,
    partnersSupported: totals.partnersSupported,
    peopleKg: totals.forPeople.kg,
    animalKg: totals.forAnimal.kg,
    peoplePercent: totals.forPeople.percent,
    animalPercent: totals.forAnimal.percent,
    rating: totals.ratingAvg,
    ratingCount: totals.ratingCount,
    mode,
  };
}

export function parseSiteId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 && !isVirtualHqSiteId(parsed) ? parsed : null;
}

export function siteIdsFromOrganisation(
  sites: Array<{ id?: number | null }> | null | undefined,
  user?: BusinessUser | null,
) {
  const ids = new Set<number>();
  for (const site of sites ?? []) {
    const id = parseSiteId(site?.id);
    if (id) ids.add(id);
  }
  const fallback = parseSiteId(user?.siteId);
  if (fallback) ids.add(fallback);
  return [...ids];
}

export async function fetchAggregatedSiteImpact(
  siteIds: number[],
  period: Exclude<ImpactPeriod, "range">,
  options?: ImpactFetchOptions,
): Promise<SiteImpactResponse | null> {
  const orgId = options?.orgId ?? null;

  if (options?.preferOrgScope && orgId != null && siteIds.length !== 1) {
    return getOrgImpact(orgId, period).catch(() => null);
  }

  if (siteIds.length === 0) {
    if (orgId != null) {
      return getOrgImpact(orgId, period).catch(() => null);
    }
    return null;
  }

  if (siteIds.length === 1) {
    return getSiteImpact(siteIds[0], period);
  }

  const settled = await Promise.allSettled(siteIds.map((siteId) => getSiteImpact(siteId, period)));
  const responses = settled
    .filter((result): result is PromiseFulfilledResult<SiteImpactResponse> => result.status === "fulfilled")
    .map((result) => result.value);

  if (responses.length === 0) {
    if (orgId != null) {
      return getOrgImpact(orgId, period).catch(() => null);
    }
    const firstError = settled.find((result) => result.status === "rejected");
    if (firstError && firstError.status === "rejected") throw firstError.reason;
    return null;
  }

  if (responses.some((response) => response.mode === "RECEIVER") && orgId != null) {
    return getOrgImpact(orgId, period).catch(() => aggregateSiteImpacts(responses));
  }

  return aggregateSiteImpacts(responses);
}

export async function fetchAggregatedSiteImpactByRange(
  siteIds: number[],
  range: ImpactDateRange,
  options?: ImpactFetchOptions,
): Promise<SiteImpactResponse | null> {
  const orgId = options?.orgId ?? null;

  if (options?.preferOrgScope && orgId != null && siteIds.length !== 1) {
    return getOrgImpactByRange(orgId, range).catch(() => null);
  }

  if (siteIds.length === 0) {
    if (orgId != null) {
      return getOrgImpactByRange(orgId, range).catch(() => null);
    }
    return null;
  }

  if (siteIds.length === 1) {
    return getSiteImpactByRange(siteIds[0], range);
  }

  const settled = await Promise.allSettled(
    siteIds.map((siteId) => getSiteImpactByRange(siteId, range)),
  );
  const responses = settled
    .filter((result): result is PromiseFulfilledResult<SiteImpactResponse> => result.status === "fulfilled")
    .map((result) => result.value);

  if (responses.length === 0) {
    if (orgId != null) {
      return getOrgImpactByRange(orgId, range).catch(() => null);
    }
    const firstError = settled.find((result) => result.status === "rejected");
    if (firstError && firstError.status === "rejected") throw firstError.reason;
    return null;
  }

  if (responses.some((response) => response.mode === "RECEIVER") && orgId != null) {
    return getOrgImpactByRange(orgId, range).catch(() => aggregateSiteImpacts(responses));
  }

  return aggregateSiteImpacts(responses);
}

/** Same lifetime aggregation as the Saveful for Business home dashboard. */
export async function fetchBusinessLifetimeImpact(user: BusinessUser) {
  const payload = await getBusinessOrganisation().catch(() => ({ sites: [] as Array<{ id: number }> }));
  const siteIds = siteIdsFromOrganisation(payload.sites, user);
  const impact = await fetchAggregatedSiteImpact(siteIds, "lifetime", { orgId: user.organisationId });
  return mapImpactToDisplayStats(impact);
}

export type ChartMetricKey = "food" | "meals" | "co2" | "collections";

export function buildChartSeries(impact: SiteImpactResponse | null, metric: ChartMetricKey) {
  const points = impact?.chart ?? [];
  const labels = points.map((point) => String(point.label ?? ""));
  const kgValues = points.map((point) => {
    const raw = Number(point.kg);
    return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  });
  const totalKg = Number(impact?.totals?.redistributedKg) || 0;
  const totalCollections = Number(impact?.totals?.collectionsCompleted) || 0;

  const values = kgValues.map((kg) => {
    if (metric === "meals") return kg > 0 ? round1(kg / IMPACT.MEAL_WEIGHT_KG) : 0;
    if (metric === "co2") return round1(kg * IMPACT.CO2_PER_KG);
    if (metric === "collections") {
      if (totalKg <= 0 || totalCollections <= 0) return 0;
      return round1((kg / totalKg) * totalCollections);
    }
    return round1(kg);
  });

  return labels.map((label, index) => ({ label, value: values[index] ?? 0 }));
}

export function canDownloadImpactReports(entitlements: Entitlements | null | undefined) {
  return hasAdvancedImpactAccess(entitlements);
}

export function hasAdvancedImpactAccess(entitlements: Entitlements | null | undefined) {
  if (!entitlements) return false;
  if (!entitlements.billingRequired) return true;
  if (!entitlements.entitled) return false;
  const features = entitlements.features ?? [];
  if (features.includes("cost_saving_insights") || features.includes("esg_reports")) return true;
  const label = `${entitlements.planName ?? ""} ${entitlements.planDisplayName ?? ""}`.toLowerCase();
  if (label.includes("plus") || label.includes("multi") || label.includes("enterprise")) return true;
  if (label.includes("single") && !label.includes("plus")) return false;
  if (entitlements.maxSites != null && entitlements.maxSites > 1) return true;
  return false;
}

export function formatImpactNumber(value: number, digits = 1) {
  return value.toLocaleString("en-US", { maximumFractionDigits: digits });
}
