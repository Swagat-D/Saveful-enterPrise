import { getOrganization, organizationLocale } from "@/lib/organization";

/** Central Saveful impact methodology. Dashboard, Sites, Insights and Reports must use these. */

export const IMPACT = {
  MEAL_WEIGHT_KG: 0.42,
  CO2_PER_KG: 2.1,
  FOOD_VALUE_PER_KG: 14.64,
} as const;

export type CalculatedImpact = {
  foodKg: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  foodValue: number;
};

export function calculateImpact(foodKg: number): CalculatedImpact {
  const kg = Math.max(0, foodKg);
  return {
    foodKg: kg,
    mealsCreated: kg / IMPACT.MEAL_WEIGHT_KG,
    co2AvoidedKg: kg * IMPACT.CO2_PER_KG,
    foodValue: kg * IMPACT.FOOD_VALUE_PER_KG,
  };
}

export function roundImpact(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const KG_TO_LB = 2.2046226218;

export function formatKg(value: number) {
  const org = getOrganization();
  const locale = organizationLocale(org);
  if (org.units === "imperial") {
    const pounds = value * KG_TO_LB;
    return `${roundImpact(pounds, pounds >= 100 ? 0 : 1).toLocaleString(locale)} lb`;
  }
  return `${roundImpact(value, value >= 100 ? 0 : 1).toLocaleString(locale)} kg`;
}

export function formatMoney(value: number) {
  const org = getOrganization();
  return new Intl.NumberFormat(organizationLocale(org), {
    style: "currency",
    currency: org.currency,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatCount(value: number) {
  return Math.round(value).toLocaleString(organizationLocale());
}

export function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
