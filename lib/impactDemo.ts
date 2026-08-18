import { demoSites } from "@/lib/demo";

export const FOOD_VALUE_PER_KG = 14.64;
export const MEAL_WEIGHT_KG = 0.42;
export const CO2_PER_KG = 2.1;

export type ImpactFilterMode = "all_time" | "custom";
export type ChartPeriod = "week" | "month" | "year";
export type ChartMetric = "food" | "meals" | "co2" | "collections";

export type ImpactStats = {
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
};

export type TopFood = {
  rank: number;
  name: string;
  category: string;
  totalKg: number;
  peopleKg: number;
  animalKg: number;
  mealsCreated: number;
  co2AvoidedKg: number;
};

export type Recipient = {
  rank: number;
  name: string;
  kind: "people" | "animals";
  collections: number;
  totalKg: number;
  mealsCreated: number;
  lastCollectionAt: string;
  sharePercent: number;
  foods: { name: string; totalKg: number }[];
};

const ORG_STATS: ImpactStats = {
  redistributedKg: 128,
  mealsCreated: 304,
  co2AvoidedKg: 268.8,
  foodSavedMoney: 1873.92,
  collectionsCompleted: 19,
  partnersSupported: 5,
  peopleKg: 96,
  animalKg: 32,
  peoplePercent: 75,
  animalPercent: 25,
  rating: 4.8,
  ratingCount: 12,
};

const SITE_STATS: Record<string, ImpactStats> = {
  hq: {
    redistributedKg: 72,
    mealsCreated: 171,
    co2AvoidedKg: 151.2,
    foodSavedMoney: 1054.08,
    collectionsCompleted: 9,
    partnersSupported: 4,
    peopleKg: 64,
    animalKg: 8,
    peoplePercent: 89,
    animalPercent: 11,
    rating: 4.9,
    ratingCount: 6,
  },
  "2": {
    redistributedKg: 32,
    mealsCreated: 76,
    co2AvoidedKg: 67.2,
    foodSavedMoney: 468.48,
    collectionsCompleted: 6,
    partnersSupported: 3,
    peopleKg: 24,
    animalKg: 8,
    peoplePercent: 75,
    animalPercent: 25,
    rating: 4.7,
    ratingCount: 4,
  },
  "3": {
    redistributedKg: 24,
    mealsCreated: 57,
    co2AvoidedKg: 50.4,
    foodSavedMoney: 351.36,
    collectionsCompleted: 4,
    partnersSupported: 2,
    peopleKg: 8,
    animalKg: 16,
    peoplePercent: 33,
    animalPercent: 67,
    rating: 4.6,
    ratingCount: 2,
  },
};

const PERIOD_FACTOR: Record<string, number> = {
  all_time: 1,
  "7": 0.18,
  "30": 0.42,
  "90": 0.7,
};

export const TOP_FOODS: TopFood[] = [
  { rank: 1, name: "Bread", category: "Bakery", totalKg: 32, peopleKg: 30, animalKg: 2, mealsCreated: 76, co2AvoidedKg: 67.2 },
  { rank: 2, name: "Prepared meals", category: "Ready to eat", totalKg: 28, peopleKg: 28, animalKg: 0, mealsCreated: 66, co2AvoidedKg: 58.8 },
  { rank: 3, name: "Fresh fruit & veg", category: "Produce", totalKg: 24, peopleKg: 16, animalKg: 8, mealsCreated: 57, co2AvoidedKg: 50.4 },
  { rank: 4, name: "Baked goods", category: "Bakery", totalKg: 18, peopleKg: 16, animalKg: 2, mealsCreated: 42, co2AvoidedKg: 37.8 },
  { rank: 5, name: "Dairy", category: "Chilled", totalKg: 14, peopleKg: 6, animalKg: 8, mealsCreated: 33, co2AvoidedKg: 29.4 },
  { rank: 6, name: "Food scraps", category: "Recovery", totalKg: 12, peopleKg: 0, animalKg: 12, mealsCreated: 0, co2AvoidedKg: 25.2 },
];

export const RECIPIENTS: Recipient[] = [
  {
    rank: 1,
    name: "OzHarvest Sydney",
    kind: "people",
    collections: 7,
    totalKg: 48,
    mealsCreated: 114,
    lastCollectionAt: "2026-08-16",
    sharePercent: 38,
    foods: [
      { name: "Prepared meals", totalKg: 18 },
      { name: "Bread", totalKg: 16 },
      { name: "Baked goods", totalKg: 14 },
    ],
  },
  {
    rank: 2,
    name: "Foodbank NSW",
    kind: "people",
    collections: 5,
    totalKg: 32,
    mealsCreated: 76,
    lastCollectionAt: "2026-08-14",
    sharePercent: 25,
    foods: [
      { name: "Fresh fruit & veg", totalKg: 16 },
      { name: "Bread", totalKg: 10 },
      { name: "Dairy", totalKg: 6 },
    ],
  },
  {
    rank: 3,
    name: "Western Sydney Farm Rescue",
    kind: "animals",
    collections: 4,
    totalKg: 20,
    mealsCreated: 0,
    lastCollectionAt: "2026-08-12",
    sharePercent: 16,
    foods: [
      { name: "Food scraps", totalKg: 12 },
      { name: "Fresh fruit & veg", totalKg: 8 },
    ],
  },
  {
    rank: 4,
    name: "Inner West Community Kitchen",
    kind: "people",
    collections: 2,
    totalKg: 16,
    mealsCreated: 38,
    lastCollectionAt: "2026-08-09",
    sharePercent: 13,
    foods: [
      { name: "Prepared meals", totalKg: 10 },
      { name: "Baked goods", totalKg: 6 },
    ],
  },
  {
    rank: 5,
    name: "Livestock Feed Co-op",
    kind: "animals",
    collections: 1,
    totalKg: 12,
    mealsCreated: 0,
    lastCollectionAt: "2026-08-05",
    sharePercent: 8,
    foods: [{ name: "Food scraps", totalKg: 12 }],
  },
];

const WEEK_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTH_LABELS = ["Week 1", "Week 2", "Week 3", "Week 4", "Week 5"];
const YEAR_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const CHART_VALUES: Record<ChartPeriod, Record<ChartMetric, number[]>> = {
  week: {
    food: [4, 6, 3, 8, 5, 9, 7],
    meals: [9, 14, 7, 19, 12, 21, 16],
    co2: [8, 13, 6, 17, 11, 19, 15],
    collections: [1, 2, 1, 3, 2, 3, 2],
  },
  month: {
    food: [18, 24, 16, 28, 22],
    meals: [42, 57, 38, 66, 52],
    co2: [38, 50, 34, 59, 46],
    collections: [3, 4, 3, 5, 4],
  },
  year: {
    food: [8, 10, 9, 12, 11, 14, 13, 12, 10, 11, 9, 9],
    meals: [19, 24, 21, 28, 26, 33, 31, 28, 24, 26, 21, 21],
    co2: [17, 21, 19, 25, 23, 29, 27, 25, 21, 23, 19, 19],
    collections: [1, 1, 1, 2, 2, 2, 2, 2, 1, 2, 1, 2],
  },
};

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function scaleStats(stats: ImpactStats, factor: number): ImpactStats {
  const redistributedKg = round1(stats.redistributedKg * factor);
  const peopleKg = round1(stats.peopleKg * factor);
  const animalKg = round1(stats.animalKg * factor);
  const total = peopleKg + animalKg;
  return {
    redistributedKg,
    mealsCreated: Math.round(stats.mealsCreated * factor),
    co2AvoidedKg: round1(stats.co2AvoidedKg * factor),
    foodSavedMoney: round2(stats.foodSavedMoney * factor),
    collectionsCompleted: Math.max(1, Math.round(stats.collectionsCompleted * factor)),
    partnersSupported: stats.partnersSupported,
    peopleKg,
    animalKg,
    peoplePercent: total > 0 ? Math.round((peopleKg / total) * 100) : 0,
    animalPercent: total > 0 ? Math.round((animalKg / total) * 100) : 0,
    rating: stats.rating,
    ratingCount: Math.max(1, Math.round(stats.ratingCount * factor)),
  };
}

export function getImpactStats(siteId: string, factor: number): ImpactStats {
  const base = siteId === "all" ? ORG_STATS : SITE_STATS[siteId] ?? ORG_STATS;
  return scaleStats(base, factor);
}

export function getFilterFactor(mode: ImpactFilterMode, startDate?: string, endDate?: string) {
  if (mode !== "custom" || !startDate || !endDate) return PERIOD_FACTOR.all_time;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  if (days <= 7) return PERIOD_FACTOR["7"];
  if (days <= 30) return PERIOD_FACTOR["30"];
  if (days <= 90) return PERIOD_FACTOR["90"];
  return 0.85;
}

export function getTopFoods(factor: number) {
  return TOP_FOODS.map((food) => ({
    ...food,
    totalKg: round1(food.totalKg * factor),
    peopleKg: round1(food.peopleKg * factor),
    animalKg: round1(food.animalKg * factor),
    mealsCreated: Math.round(food.mealsCreated * factor),
    co2AvoidedKg: round1(food.co2AvoidedKg * factor),
  }));
}

export function getRecipients(factor: number) {
  return RECIPIENTS.map((row) => ({
    ...row,
    collections: Math.max(1, Math.round(row.collections * factor)),
    totalKg: round1(row.totalKg * factor),
    mealsCreated: Math.round(row.mealsCreated * factor),
    foods: row.foods.map((food) => ({ ...food, totalKg: round1(food.totalKg * factor) })),
  }));
}

export function getChartSeries(period: ChartPeriod, metric: ChartMetric, siteId: string) {
  const labels = period === "week" ? WEEK_LABELS : period === "year" ? YEAR_LABELS : MONTH_LABELS;
  const siteFactor = siteId === "all" ? 1 : siteId === "hq" ? 0.56 : siteId === "2" ? 0.25 : 0.19;
  const values = CHART_VALUES[period][metric].map((value) => round1(value * siteFactor));
  return labels.map((label, index) => ({ label, value: values[index] ?? 0 }));
}

export function formatKg(value: number) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} kg`;
}

export function formatMoney(value: number) {
  return `$${value.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

export function formatNumber(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export function formatCollectionDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function toApiDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function presetRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { startDate: toApiDate(start), endDate: toApiDate(end) };
}

export function formatDisplayDate(iso?: string) {
  if (!iso) return "Select";
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function siteLabel(siteId: string) {
  if (siteId === "all") return "All sites";
  return demoSites.find((site) => site.id === siteId)?.name ?? "Site";
}

export function filterLabel(mode: ImpactFilterMode, startDate?: string, endDate?: string) {
  if (mode !== "custom") return "All time";
  return `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
}
