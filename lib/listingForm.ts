export type ListingKind = "people" | "farm";
export type ListingStep = 1 | 2 | 3;

export type FoodItem = {
  name: string;
  qty: number;
  icon: string;
};

export const PEOPLE_ITEMS: FoodItem[] = [
  { name: "Prepared meals", qty: 0, icon: "/listing/meal_icon.png" },
  { name: "Bread", qty: 0, icon: "/listing/bread_icon.png" },
  { name: "Baked Goods", qty: 0, icon: "/listing/baked_goods_icon.png" },
  { name: "Fresh fruit & veg", qty: 0, icon: "/listing/fruit_veg_icon.png" },
  { name: "Meat", qty: 0, icon: "/listing/meat_icon.png" },
  { name: "Dairy", qty: 0, icon: "/listing/milk_icon.png" },
];

export const FARM_ITEMS: FoodItem[] = [
  { name: "Baked goods", qty: 0, icon: "/listing/baked_goods_icon.png" },
  { name: "Fruit & veg", qty: 0, icon: "/listing/fruit_veg_icon.png" },
  { name: "Grain / cereal", qty: 0, icon: "/listing/grain_icon.png" },
  { name: "Dairy", qty: 0, icon: "/listing/milk_icon.png" },
  { name: "Food scraps – no meat", qty: 0, icon: "/listing/food_scraps_icon.png" },
  { name: "Food scraps – with meat", qty: 0, icon: "/listing/meat_icon.png" },
];

export const ALLERGEN_OPTIONS = [
  "Gluten",
  "Dairy",
  "Eggs",
  "Fish",
  "Shellfish",
  "Peanuts",
  "Tree nuts",
  "Soy",
  "Sesame",
  "Mustard",
  "Celery",
  "Lupin",
  "Molluscs",
  "Sulphites",
];

export const PEOPLE_STORAGE = [
  { label: "Fridge", icon: "/listing/fridge_icon.png" },
  { label: "Freezer", icon: "/listing/freezer_icon.png" },
  { label: "Ambient", icon: "/listing/ambient_temp_icon.png" },
  { label: "Hot", icon: "/listing/heating_icon.png" },
] as const;

export const PEOPLE_REHEAT = [
  { label: "Yes", icon: "/listing/heating_icon.png" },
  { label: "No", icon: "/listing/no_heating_icon.png" },
  { label: "Not sure", icon: null },
] as const;

export const FARM_STORAGE = [
  { label: "Fridge", icon: "/listing/fridge_icon.png" },
  { label: "Freezer", icon: "/listing/freezer_icon.png" },
  { label: "Ambient", icon: "/listing/ambient_temp_icon.png" },
  { label: "Dry storage", icon: "/listing/dry_storage.png" },
  { label: "Boxed", icon: "/listing/storage_box_green.png" },
  { label: "Bulk Bin", icon: "/listing/bin_icon.png" },
  { label: "Pallet", icon: "/listing/pallets_icon.png" },
  { label: "Other", icon: null },
] as const;

export const CONTAMINANT_OPTIONS = [
  "Contains Packaging",
  "Contains meat/bone",
  "Contains plastic risk",
  "Mixed materials",
  "Contains Dairy",
  "Other (please specify)",
];

export const STEP_META = [
  { id: 1 as ListingStep, title: "Food details" },
  { id: 2 as ListingStep, title: "Collection logistics" },
  { id: 3 as ListingStep, title: "Confirm listing" },
];

export function formatQty(qty: number) {
  return qty % 1 === 0 ? qty.toFixed(0) : qty.toFixed(1);
}

export function estimateMealsSaved(totalKg: number) {
  return Math.floor((Math.max(0, totalKg) * 1000) / 420);
}

export function estimateCo2AvoidedKg(totalKg: number) {
  return Math.round(Math.max(0, totalKg) * 2.1 * 10) / 10;
}

export function formatCo2AvoidedKg(totalKg: number) {
  const value = estimateCo2AvoidedKg(totalKg);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function formatDate(date: Date | null) {
  if (!date) return "Select date";
  return date.toLocaleDateString([], { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateShort(date: Date | null) {
  if (!date) return "Date";
  return date.toLocaleDateString([], { day: "2-digit", month: "short" });
}

export function formatTime(date: Date | null) {
  if (!date) return "--:--";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true });
}

export function toDateValue(date: Date | null) {
  if (!date) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function toTimeValue(date: Date | null) {
  if (!date) return "";
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function toDateTimeValue(date: Date | null) {
  if (!date) return "";
  return `${toDateValue(date)}T${toTimeValue(date)}`;
}

export function parseDateValue(value: string, existing: Date | null) {
  if (!value) return null;
  const next = existing ? new Date(existing) : new Date();
  const [y, m, d] = value.split("-").map(Number);
  next.setFullYear(y, m - 1, d);
  if (!existing) next.setHours(23, 59, 0, 0);
  return next;
}

export function parseTimeValue(value: string, existing: Date | null) {
  if (!value) return existing;
  const next = existing ? new Date(existing) : new Date();
  const [h, min] = value.split(":").map(Number);
  next.setHours(h, min, 0, 0);
  return next;
}

export function parseDateTimeValue(value: string) {
  if (!value) return null;
  const next = new Date(value);
  return Number.isNaN(next.getTime()) ? null : next;
}

function calendarDayMs(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export type ListingFieldErrors = {
  foodItems?: string;
  location?: string;
  bestBefore?: string;
  pickupFrom?: string;
  pickupTo?: string;
  storage?: string;
  reheating?: string;
  confirmedSafe?: string;
};

export function getFoodItemsError(totalQty: number) {
  if (totalQty <= 0) return "Add at least one food item with quantity greater than 0.";
  return undefined;
}

export function getListingDateErrors(
  bestBefore: Date | null,
  pickupFrom: Date | null,
  pickupTo: Date | null,
): ListingFieldErrors {
  const errors: ListingFieldErrors = {};

  if (!bestBefore) errors.bestBefore = "Please select a best before date.";
  if (!pickupFrom) errors.pickupFrom = "Please select a pickup start time.";
  if (!pickupTo) errors.pickupTo = "Please select a pickup end time.";

  if (pickupFrom && pickupTo && pickupTo <= pickupFrom) {
    errors.pickupTo = "Pickup end time must be after pickup start time.";
  }

  if (bestBefore) {
    if (pickupFrom && calendarDayMs(pickupFrom) > calendarDayMs(bestBefore)) {
      errors.pickupFrom = "Pickup start must be on or before the best before date.";
    }
    if (pickupTo && calendarDayMs(pickupTo) > calendarDayMs(bestBefore)) {
      errors.pickupTo = "Pickup end must be on or before the best before date.";
    }
  }

  return errors;
}
