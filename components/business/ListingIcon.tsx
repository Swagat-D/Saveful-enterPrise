import { cn } from "@/lib/utils";

export const LISTING_ICONS = {
  people: "/listing/people_icon.png",
  animals: "/listing/cow_front.png",
  surplusPeople: "/listing/veggie_basket.png",
  surplusFarm: "/listing/farmhouse.png",
  items: "/listing/veggie_basket_icon.png",
  calendar: "/listing/calender_icon.png",
  clock: "/listing/clock_icon.png",
  leaf: "/listing/leaf_icon.png",
  impact: "/listing/co2_green_icon.png",
  impactOrange: "/listing/co2_orange_icon.png",
  meals: "/listing/cutlery_icon.png",
  collections: "/listing/truck_icon.png",
  livestock: "/listing/livestock.png",
  allergen: "/listing/allergen_icon.png",
  fridge: "/listing/fridge_icon.png",
  freezer: "/listing/freezer_icon.png",
  ambient: "/listing/ambient_temp_icon.png",
  hot: "/listing/heating_icon.png",
  noHeat: "/listing/no_heating_icon.png",
  dry: "/listing/dry_storage.png",
  boxed: "/listing/storage_box_green.png",
  boxedOrange: "/listing/storage_box_orange.png",
  money: "/listing/money_icon.png",
  charities: "/listing/charity_green.png",
  rating: "/listing/rating_icon.png",
  bin: "/listing/bin_icon.png",
  pallet: "/listing/pallets_icon.png",
  meal: "/listing/meal_icon.png",
  bread: "/listing/bread_icon.png",
  baked: "/listing/baked_goods_icon.png",
  fruit: "/listing/fruit_veg_icon.png",
  meat: "/listing/meat_icon.png",
  dairy: "/listing/milk_icon.png",
  grain: "/listing/grain_icon.png",
  scraps: "/listing/food_scraps_icon.png",
  basket: "/listing/veggie_basket.png",
} as const;

const PEOPLE_FOOD_ICONS: Record<string, string> = {
  "Prepared meals": LISTING_ICONS.meal,
  Bread: LISTING_ICONS.bread,
  "Baked Goods": LISTING_ICONS.baked,
  "Fresh fruit & veg": LISTING_ICONS.fruit,
  Meat: LISTING_ICONS.meat,
  Dairy: LISTING_ICONS.dairy,
};

const FARM_FOOD_ICONS: Record<string, string> = {
  "Baked goods": LISTING_ICONS.bread,
  "Fruit & veg": LISTING_ICONS.fruit,
  "Grain / cereal": LISTING_ICONS.grain,
  Dairy: LISTING_ICONS.dairy,
  "Food scraps – no meat": LISTING_ICONS.scraps,
  "Food scraps – with meat": LISTING_ICONS.meat,
};

const STORAGE_ICONS: Record<string, string> = {
  Fridge: LISTING_ICONS.fridge,
  Freezer: LISTING_ICONS.freezer,
  Ambient: LISTING_ICONS.ambient,
  Hot: LISTING_ICONS.hot,
  "Dry storage": LISTING_ICONS.dry,
  Boxed: LISTING_ICONS.boxed,
  "Bulk Bin": LISTING_ICONS.bin,
  Pallet: LISTING_ICONS.pallet,
};

const REHEAT_ICONS: Record<string, string> = {
  Yes: LISTING_ICONS.hot,
  No: LISTING_ICONS.noHeat,
};

export function foodItemIcon(name: string, farm = false) {
  return (farm ? FARM_FOOD_ICONS[name] : PEOPLE_FOOD_ICONS[name]) || LISTING_ICONS.basket;
}

export function storageIcon(label: string) {
  return STORAGE_ICONS[label];
}

export function reheatIcon(label: string) {
  return REHEAT_ICONS[label];
}

export function ListingIcon({
  src,
  alt = "",
  className,
}: {
  src: string;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={cn("object-contain", className)} />
  );
}
