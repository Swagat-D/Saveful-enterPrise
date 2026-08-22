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

export function formatKg(value: number) {
  return `${roundImpact(value, value >= 100 ? 0 : 1).toLocaleString("en-US")} kg`;
}

export function formatMoney(value: number) {
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

export function formatCount(value: number) {
  return Math.round(value).toLocaleString("en-US");
}

export function percentChange(current: number, previous: number) {
  if (previous <= 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}
