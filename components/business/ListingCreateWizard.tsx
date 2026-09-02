"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Calendar,
  Camera,
  Check,
  Clock,
  Flame,
  ImagePlus,
  Leaf,
  MapPin,
  Minus,
  Plus,
  Snowflake,
  TriangleAlert,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { LISTING_ICONS, ListingIcon, foodItemIcon, reheatIcon, storageIcon } from "@/components/business/ListingIcon";
import { PortalPageShell } from "@/components/ui/Portal";
import { ApiError } from "@/lib/api";
import { createBusinessListing } from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import { useEntitlements } from "@/lib/businessBilling";
import { isBusinessMultiHeadOffice } from "@/lib/businessHqSite";
import {
  getSitePickupCoords,
  getSitePostcode,
  listingAuthUser,
  resolveListingSiteId,
} from "@/lib/businessListingSite";
import {
  ALLERGEN_OPTIONS,
  CONTAMINANT_OPTIONS,
  FARM_FOOD_ITEMS,
  FARM_STORAGE,
  PEOPLE_FOOD_ITEMS,
  PEOPLE_STORAGE,
  REHEATING_OPTIONS,
  estimateMealsSaved,
  formatCo2AvoidedKg,
  fromDateInput,
  fromDateTimeLocal,
  getListingDateErrors,
  getListingFoodItemsError,
  hasListingDateErrors,
} from "@/lib/businessListings";
import { formatDate, formatDateShort, formatQty, formatTime } from "@/lib/listingForm";
import { cn } from "@/lib/utils";

const TERMS_URL = "https://www.saveful.com/saveful-for-business-terms-conditions";

type Audience = "people" | "farm";
type Step = 1 | 2 | 3;
type FoodRow = { name: string; qty: number };

const STEP_META = [
  { id: 1 as Step, title: "Food details" },
  { id: 2 as Step, title: "Collection logistics" },
  { id: 3 as Step, title: "Confirm listing" },
];

export function ListingCreateWizard({ audience }: { audience: Audience }) {
  const user = useBusinessSession();
  const router = useRouter();
  const { entitlements } = useEntitlements();
  const farm = audience === "farm";
  const seed = farm ? FARM_FOOD_ITEMS : PEOPLE_FOOD_ITEMS;
  const photoInput = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>(1);
  const [items, setItems] = useState<FoodRow[]>(seed.map((name) => ({ name, qty: 0 })));
  const [customItem, setCustomItem] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [bestBefore, setBestBefore] = useState("");
  const [pickupFrom, setPickupFrom] = useState("");
  const [pickupTo, setPickupTo] = useState("");
  const [storage, setStorage] = useState<string | null>(null);
  const [farmStorage, setFarmStorage] = useState<string[]>([]);
  const [reheating, setReheating] = useState<(typeof REHEATING_OPTIONS)[number] | null>(null);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [formError, setFormError] = useState("");

  const needsPlan = Boolean(entitlements?.billingRequired && !entitlements.entitled);
  const activeItems = items.filter((item) => item.qty > 0);
  const totalQty = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const bestBeforeDate = fromDateInput(bestBefore);
  const pickupFromDate = fromDateTimeLocal(pickupFrom);
  const pickupToDate = fromDateTimeLocal(pickupTo);
  const accent = farm ? "text-orange-700" : "text-saveful-green";
  const accentFill = farm ? "bg-orange-600 hover:bg-orange-700" : "bg-saveful-green hover:bg-green-700";

  useEffect(() => {
    if (!user) return;
    setLocation((current) => current || user.address || "");
  }, [user]);

  useEffect(() => {
    const urls = photos.map((file) => URL.createObjectURL(file));
    setPhotoUrls(urls);
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, [photos]);

  const addPhotos = (files: FileList | File[]) => {
    const next = [...photos, ...Array.from(files)].slice(0, 5);
    setPhotos(next);
  };

  const updateQty = (index: number, delta: number) => {
    setItems((current) =>
      current.map((row, rowIndex) =>
        rowIndex === index ? { ...row, qty: Math.max(0, Math.round((row.qty + delta) * 10) / 10) } : row,
      ),
    );
    if (errors.foodItems) setErrors((current) => ({ ...current, foodItems: "" }));
  };

  const toggleChip = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const continueFrom = (current: Step) => {
    if (current === 1) {
      const foodError = getListingFoodItemsError(totalQty);
      if (foodError) {
        setErrors({ foodItems: foodError });
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }
    const dateErrors = getListingDateErrors(
      fromDateInput(bestBefore),
      fromDateTimeLocal(pickupFrom),
      fromDateTimeLocal(pickupTo),
    );
    const next: Record<string, string> = { ...dateErrors };
    if (!farm && !storage) next.storage = "Please select a storage requirement.";
    if (!farm && !reheating) next.reheating = "Please select whether reheating is required.";
    if (hasListingDateErrors(dateErrors) || next.storage || next.reheating) {
      setErrors(next);
      return;
    }
    setErrors({});
    setStep(3);
  };

  const onSubmit = async () => {
    if (savingRef.current) return;
    if (needsPlan) {
      router.push("/business/plans");
      return;
    }
    if (!confirmedSafe) {
      setErrors({
        confirmedSafe: farm
          ? "Please confirm this material is for livestock/agricultural use."
          : "Please confirm this food is safe for donation.",
      });
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setFormError("");
    try {
      const authUser = await listingAuthUser(user);
      const resolvedSiteId = await resolveListingSiteId(authUser);
      if (!resolvedSiteId) {
        setFormError(
          isBusinessMultiHeadOffice(authUser) || authUser?.role === "restaurant_multi"
            ? "Your head office site is not ready yet."
            : "Please set up your business site first.",
        );
        return;
      }
      const coords = getSitePickupCoords(authUser);
      if (!coords) {
        setErrors({
          location: farm
            ? "Your site location is not set. Set your farm address on the map from Home."
            : "Your site location is not set. Set your business address on the map from Home.",
        });
        setStep(2);
        return;
      }
      const best = fromDateInput(bestBefore);
      const from = fromDateTimeLocal(pickupFrom);
      const to = fromDateTimeLocal(pickupTo);
      const dateErrors = getListingDateErrors(best, from, to);
      if (hasListingDateErrors(dateErrors) || !best || !from || !to) {
        setErrors(dateErrors);
        setStep(2);
        return;
      }
      const selectedFarm = farmStorage;
      await createBusinessListing({
        siteId: resolvedSiteId,
        listingType: farm ? "ANIMAL" : "HUMAN",
        foodItems: activeItems.map((item) => ({
          name: item.name,
          category: item.name,
          totalQtyKg: item.qty,
          unit: "kg",
        })),
        pickupAddress: location.trim() || authUser?.address || "Address not provided",
        pickupPostcode: getSitePostcode(authUser),
        pickupLat: coords.lat,
        pickupLng: coords.lng,
        bestBefore: best.toISOString(),
        pickupFromTime: from.toISOString(),
        pickupByTime: to.toISOString(),
        needsRefrigeration: farm ? selectedFarm.includes("Fridge") : storage === "Fridge",
        needsFreezer: farm ? selectedFarm.includes("Freezer") : storage === "Freezer",
        needsAmbient: farm
          ? selectedFarm.includes("Ambient") || selectedFarm.includes("Dry storage")
          : storage === "Ambient",
        needsHot: farm ? false : storage === "Hot",
        needsReheating: farm ? false : reheating === "Yes",
        isSafeForDonation: !farm,
        allergens,
        photos,
      });
      router.replace("/business/listings");
    } catch (err) {
      setFormError(err instanceof ApiError || err instanceof Error ? err.message : "Could not create listing.");
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <PortalPageShell className="!space-y-4">
      <div className="mx-auto w-full max-w-3xl">
        <Link href="/business/listings/new" className={cn("mb-4 inline-flex items-center gap-1.5 font-saveful-semibold text-xs", accent)}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to surplus type
        </Link>

        <section className={cn("overflow-hidden rounded-2xl border bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]", farm ? "border-orange-200" : "border-[#C8E0D2]")}>
          <header className={cn("px-5 py-5 sm:px-6", farm ? "bg-[#FFF6EC]" : "bg-[#F0F8F3]")}>
            <div className="flex items-center gap-3">
              <ListingIcon src={farm ? LISTING_ICONS.livestock : LISTING_ICONS.people} className="h-14 w-14" />
              <div>
                <h1 className="font-saveful-bold text-xl text-gray-900 sm:text-2xl">
                  {farm ? "Surplus for livestock" : "Surplus for people"}
                </h1>
                <p className="mt-0.5 font-saveful text-sm text-gray-500">
                  {farm ? "Helping surplus find a useful next life" : "Helping good food go further"}
                </p>
              </div>
            </div>

            <ol className="mt-5 flex items-center justify-between gap-2">
              {STEP_META.map((item, index) => {
                const active = step === item.id;
                const done = step > item.id;
                return (
                  <li key={item.id} className="flex min-w-0 flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => (item.id <= step ? setStep(item.id) : undefined)}
                      className="flex min-w-0 flex-col items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 items-center justify-center rounded-full font-saveful-bold text-sm",
                          active || done ? `${accentFill.split(" ")[0]} text-white` : "bg-white text-gray-400 ring-1 ring-black/[0.08]",
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : item.id}
                      </span>
                      <span className={cn("text-center font-saveful-semibold text-[11px] leading-tight", active || done ? "text-gray-800" : "text-gray-400")}>
                        {item.title}
                      </span>
                    </button>
                    {index < STEP_META.length - 1 ? (
                      <span className={cn("mb-5 h-0.5 flex-1 rounded-full", done ? (farm ? "bg-orange-400" : "bg-saveful-green") : "bg-black/[0.08]")} />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            {needsPlan ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-saveful text-sm text-amber-900">
                This organisation needs a trial or plan before listings can be created.{" "}
                <Link href="/business/plans" className="font-saveful-semibold underline">
                  View plans
                </Link>
              </p>
            ) : null}
            {formError ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 font-saveful text-sm text-red-700">{formError}</p>
            ) : null}

            {step === 1 ? (
              <>
                <Section title="What food do you have?">
                  <div className="mb-2 flex items-center justify-end pr-1">
                    <span className="font-saveful-semibold text-[11px] uppercase tracking-wide text-gray-400">KG</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {items.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                        <ListingIcon src={foodItemIcon(item.name, farm)} className="h-9 w-9 shrink-0" />
                        <p className="min-w-0 flex-1 font-saveful text-sm text-gray-700">{item.name}</p>
                        <div className="flex items-center gap-2">
                          <QtyButton onClick={() => updateQty(index, -0.5)}>
                            <Minus className="h-3.5 w-3.5" />
                          </QtyButton>
                          <span className="w-10 text-center font-saveful-bold text-sm text-gray-900">
                            {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)}
                          </span>
                          <QtyButton onClick={() => updateQty(index, 0.5)}>
                            <Plus className="h-3.5 w-3.5" />
                          </QtyButton>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 flex gap-2">
                    <input
                      value={customItem}
                      onChange={(event) => setCustomItem(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          if (!customItem.trim()) return;
                          setItems((current) => [...current, { name: customItem.trim(), qty: 0 }]);
                          setCustomItem("");
                        }
                      }}
                      placeholder="Add other item..."
                      className="h-11 flex-1 rounded-xl border border-[#E4E0D6] bg-[#F7F6F2] px-3.5 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!customItem.trim()) return;
                        setItems((current) => [...current, { name: customItem.trim(), qty: 0 }]);
                        setCustomItem("");
                      }}
                      className={cn("flex h-11 w-11 items-center justify-center rounded-xl text-white", accentFill)}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </Section>

                <Section title="Quantity (kg)">
                  <div className="flex flex-col items-center justify-center py-3">
                    <p className="font-saveful-bold text-4xl tracking-tight text-gray-900">{totalQty} KG</p>
                    <p className="mt-1 font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">
                      Estimate total weight of surplus food
                    </p>
                  </div>
                  {errors.foodItems ? <p className="mt-2 text-center font-saveful text-sm text-red-600">{errors.foodItems}</p> : null}
                </Section>

                <Section title="Add photo (optional)">
                  <input
                    ref={photoInput}
                    type="file"
                    accept="image/*"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      if (event.target.files) addPhotos(event.target.files);
                      event.target.value = "";
                    }}
                  />
                  {photos.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => photoInput.current?.click()}
                      className="flex min-h-40 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed border-[#C9C9C9] bg-[#FBFBF8] px-4 py-8 text-center transition hover:border-saveful-green/40 hover:bg-[#F0F8F3]"
                    >
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-2xl font-saveful-bold text-gray-400 shadow-sm">
                        +
                      </span>
                      <p className="mt-3 font-saveful-semibold text-sm text-gray-700">Add photos</p>
                      <p className="mt-1 font-saveful text-xs text-gray-400">Up to 5 images · photos help charities plan collections</p>
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                        {photoUrls.map((url, index) => (
                          <div key={url} className="relative aspect-square overflow-hidden rounded-xl bg-[#F7F6F2]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={url} alt="" className="h-full w-full object-cover" />
                            <button
                              type="button"
                              onClick={() => setPhotos((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                              className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/65 text-white"
                              aria-label="Remove photo"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                        {photos.length < 5 ? (
                          <button
                            type="button"
                            onClick={() => photoInput.current?.click()}
                            className="flex aspect-square flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#C9C9C9] text-gray-400 hover:border-saveful-green/40"
                          >
                            <Plus className="h-5 w-5" />
                          </button>
                        ) : null}
                      </div>
                      <p className="font-saveful text-xs text-gray-400">{photos.length} photo(s) selected</p>
                    </div>
                  )}
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => photoInput.current?.click()}
                      className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#C9C9C9] bg-white font-saveful-semibold text-sm text-gray-700"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Gallery
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!photoInput.current) return;
                        photoInput.current.setAttribute("capture", "environment");
                        photoInput.current.click();
                        photoInput.current.removeAttribute("capture");
                      }}
                      className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-xl font-saveful-semibold text-sm text-white", accentFill)}
                    >
                      <Camera className="h-4 w-4" />
                      Camera
                    </button>
                  </div>
                  <p className="mt-2 font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-400">
                    Photos help charities plan collections
                  </p>
                </Section>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Section title="Pickup location">
                  <input
                    value={location}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="Enter pickup address"
                    className="h-11 w-full rounded-xl border border-[#E4E0D6] bg-[#F7F6F2] px-3.5 font-saveful text-sm outline-none focus:bg-white"
                  />
                  {errors.location ? <p className="mt-2 font-saveful text-xs text-red-600">{errors.location}</p> : null}
                </Section>

                <Section title="Food best before">
                  <label className="block">
                    <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-wide text-gray-400">Date</span>
                    <input type="date" value={bestBefore} onChange={(event) => setBestBefore(event.target.value)} className="h-11 w-full rounded-xl border border-[#E4E0D6] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none" />
                  </label>
                  {errors.bestBefore ? <p className="mt-2 font-saveful text-xs text-red-600">{errors.bestBefore}</p> : null}
                </Section>

                <Section title="Pickup window">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-wide text-gray-400">From</span>
                      <input type="datetime-local" value={pickupFrom} onChange={(event) => setPickupFrom(event.target.value)} className="h-11 w-full rounded-xl border border-[#E4E0D6] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none" />
                      {errors.pickupFrom ? <p className="mt-1 font-saveful text-xs text-red-600">{errors.pickupFrom}</p> : null}
                    </label>
                    <label className="block">
                      <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-wide text-gray-400">To</span>
                      <input type="datetime-local" value={pickupTo} onChange={(event) => setPickupTo(event.target.value)} className="h-11 w-full rounded-xl border border-[#E4E0D6] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none" />
                      {errors.pickupTo ? <p className="mt-1 font-saveful text-xs text-red-600">{errors.pickupTo}</p> : null}
                    </label>
                  </div>
                </Section>

                {farm ? (
                  <>
                    <Section title="Storage">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {FARM_STORAGE.map((option) => (
                          <ChoiceTile
                            key={option}
                            label={option}
                            icon={storageIcon(option)}
                            active={farmStorage.includes(option)}
                            farm
                            onClick={() => toggleChip(farmStorage, option, setFarmStorage)}
                          />
                        ))}
                      </div>
                    </Section>
                    <Section title="Possible contaminants">
                      <div className="flex flex-wrap gap-2">
                        {CONTAMINANT_OPTIONS.map((option) => (
                          <ChoiceTile
                            key={option}
                            label={option}
                            active={allergens.includes(option)}
                            farm
                            onClick={() => toggleChip(allergens, option, setAllergens)}
                          />
                        ))}
                      </div>
                    </Section>
                  </>
                ) : (
                  <>
                    <Section title="Storage requirements">
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {PEOPLE_STORAGE.map((option) => (
                          <ChoiceTile
                            key={option}
                            label={option}
                            icon={storageIcon(option)}
                            active={storage === option}
                            onClick={() => setStorage(option)}
                          />
                        ))}
                      </div>
                      {errors.storage ? <p className="mt-2 font-saveful text-xs text-red-600">{errors.storage}</p> : null}
                    </Section>
                    <Section title="Reheating required?">
                      <div className="grid grid-cols-3 gap-2">
                        {REHEATING_OPTIONS.map((option) => (
                          <ChoiceTile
                            key={option}
                            label={option}
                            icon={reheatIcon(option)}
                            active={reheating === option}
                            onClick={() => setReheating(option)}
                          />
                        ))}
                      </div>
                      {errors.reheating ? <p className="mt-2 font-saveful text-xs text-red-600">{errors.reheating}</p> : null}
                    </Section>
                    <Section title="Allergens (optional)">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="inline-flex items-center gap-1.5 font-saveful text-xs text-gray-500">
                          <ListingIcon src={LISTING_ICONS.allergen} className="h-4 w-4" />
                          Select any that apply
                        </span>
                        <div className="flex gap-3">
                          <button type="button" onClick={() => setAllergens([...ALLERGEN_OPTIONS])} className="font-saveful-semibold text-xs text-saveful-green">
                            Select all
                          </button>
                          <button type="button" onClick={() => setAllergens([])} className="font-saveful-semibold text-xs text-gray-400">
                            Clear
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {ALLERGEN_OPTIONS.map((option) => (
                          <ChoiceTile
                            key={option}
                            label={option}
                            active={allergens.includes(option)}
                            compact
                            onClick={() => toggleChip(allergens, option, setAllergens)}
                          />
                        ))}
                      </div>
                    </Section>
                  </>
                )}
              </>
            ) : null}

            {step === 3 ? (
              <>
                <Section title="Food summary">
                  <div className="mb-2 flex justify-between font-saveful-semibold text-[11px] uppercase tracking-wide text-gray-400">
                    <span>Item name</span>
                    <span>Available</span>
                  </div>
                  {activeItems.map((item) => (
                    <div key={item.name} className="flex items-center justify-between gap-3 py-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <ListingIcon src={foodItemIcon(item.name, farm)} className="h-7 w-7" />
                        <span className="font-saveful text-sm text-gray-700">{item.name}</span>
                      </div>
                      <span className="font-saveful-semibold text-sm tabular-nums text-gray-800">
                        {formatQty(item.qty)} kg
                      </span>
                    </div>
                  ))}
                  {!activeItems.length ? (
                    <p className="py-4 text-center font-saveful text-sm text-gray-400">No items selected</p>
                  ) : null}
                  <p className="mt-3 font-saveful-semibold text-sm text-gray-800">
                    Total Quantity: {formatQty(Math.max(totalQty, 0))} kg
                  </p>
                </Section>

                {photoUrls.length ? (
                  <Section title="Photos">
                    <div className="grid grid-cols-3 gap-2">
                      {photoUrls.map((url) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={url} src={url} alt="" className="aspect-square rounded-xl object-cover" />
                      ))}
                    </div>
                  </Section>
                ) : null}

                <Section title="Collection summary">
                  <SummaryRow icon={MapPin} farm={farm} text={location || "Address not provided"} />
                  <SummaryRow
                    icon={Calendar}
                    farm={farm}
                    text={`Best Before - ${formatDate(bestBeforeDate)}`}
                  />
                  <SummaryRow
                    icon={Clock}
                    farm={farm}
                    text={`Pick up - ${formatDateShort(pickupFromDate)} ${formatTime(pickupFromDate)} to ${formatDateShort(pickupToDate)} ${formatTime(pickupToDate)}`}
                  />
                  {farm ? (
                    farmStorage.map((item) => (
                      <SummaryRow key={item} icon={Snowflake} farm text={item} />
                    ))
                  ) : (
                    <>
                      <SummaryRow icon={Snowflake} farm={farm} text={storage || "Not selected"} />
                      <SummaryRow icon={Flame} farm={farm} text={`Reheating - ${reheating || "Not selected"}`} />
                      <SummaryRow
                        icon={TriangleAlert}
                        farm={farm}
                        text={`Allergens - ${allergens.length ? allergens.join(", ") : "None selected"}`}
                      />
                    </>
                  )}
                  {farm && allergens.length ? (
                    <SummaryRow icon={TriangleAlert} farm text={allergens.join(", ")} />
                  ) : null}
                </Section>

                <button
                  type="button"
                  onClick={() => {
                    setConfirmedSafe((prev) => !prev);
                    setErrors((prev) => ({ ...prev, confirmedSafe: "" }));
                  }}
                  className="flex items-start gap-3 text-left"
                >
                  <span
                    className={cn(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                      confirmedSafe
                        ? farm
                          ? "border-orange-600 bg-orange-600 text-white"
                          : "border-saveful-green bg-saveful-green text-white"
                        : "border-gray-300 bg-white",
                    )}
                  >
                    {confirmedSafe ? <Check className="h-3.5 w-3.5" /> : null}
                  </span>
                  <p className="font-saveful text-sm leading-relaxed text-gray-600">
                    {farm
                      ? "I confirm this material IS NOT suitable for human consumption and is only appropriate for animal livestock feed or agricultural reuse. See "
                      : "I confirm this food is safe for human consumption and suitable for charity donation. See "}
                    <a
                      href={TERMS_URL}
                      target="_blank"
                      rel="noreferrer"
                      className="font-saveful-semibold text-saveful-green underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      Terms & Conditions
                    </a>
                  </p>
                </button>
                {errors.confirmedSafe ? <p className="font-saveful text-sm text-red-600">{errors.confirmedSafe}</p> : null}

                <div className="rounded-2xl border border-saveful-green/20 bg-[#EEF4EE] p-4">
                  <p className="font-saveful-bold text-sm text-saveful-green">Your Impact</p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div className="text-center">
                      {farm ? (
                        <Leaf className="mx-auto h-5 w-5 text-saveful-green" />
                      ) : (
                        <UtensilsCrossed className="mx-auto h-5 w-5 text-saveful-green" />
                      )}
                      <p className="mt-1 font-saveful-bold text-xl text-saveful-green">
                        {farm ? formatQty(Math.max(totalQty, 0)) : Math.max(estimateMealsSaved(totalQty), 0)}
                      </p>
                      <p className="font-saveful text-xs text-saveful-green">
                        {farm ? "Kg Food Provided" : "meals saved"}
                      </p>
                    </div>
                    <div className="text-center">
                      <Leaf className="mx-auto h-5 w-5 text-saveful-green" />
                      <p className="mt-1 font-saveful-bold text-xl text-saveful-green">
                        {formatCo2AvoidedKg(totalQty)}kg
                      </p>
                      <p className="font-saveful text-xs text-saveful-green">CO2 avoided</p>
                    </div>
                  </div>
                  {!farm ? (
                    <p className="mt-2 text-center font-saveful text-xs text-saveful-green">420g = 1 meal</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 px-4 py-4 sm:flex-row sm:justify-between sm:px-6">
            <button
              type="button"
              onClick={() => {
                if (step === 1) router.push("/business/listings/new");
                else setStep((current) => (current === 3 ? 2 : 1));
              }}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-[#C9C9C9] bg-white px-5 font-saveful-semibold text-sm text-gray-700"
            >
              {step === 1 ? "Cancel" : "Back"}
            </button>
            <button
              type="button"
              disabled={saving || (step === 3 && needsPlan)}
              aria-busy={saving}
              onClick={() => (step < 3 ? continueFrom(step) : void onSubmit())}
              className={cn("inline-flex h-11 items-center justify-center rounded-xl px-6 font-saveful-bold text-sm text-white disabled:opacity-50", accentFill)}
            >
              {step < 3
                ? "Continue"
                : saving
                  ? "Creating..."
                  : farm
                    ? "Create listing"
                    : "Create charity listing"}
            </button>
          </footer>
        </section>
      </div>
    </PortalPageShell>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 font-saveful-bold text-[11px] uppercase tracking-[0.16em] text-gray-500">{title}</h2>
      <div className="rounded-2xl border border-black/[0.05] bg-white p-4">{children}</div>
    </section>
  );
}

function QtyButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D6D6D0] bg-white text-gray-600 hover:bg-[#F7F6F2]"
    >
      {children}
    </button>
  );
}

function ChoiceTile({
  label,
  icon,
  active,
  farm,
  compact,
  onClick,
}: {
  label: string;
  icon?: string;
  active: boolean;
  farm?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-xl border font-saveful-semibold text-xs transition",
        compact ? "px-3 py-2" : "min-h-[3.25rem] px-3 py-2.5",
        active
          ? farm
            ? "border-orange-400 bg-[#FFF6EC] text-orange-800"
            : "border-saveful-green bg-[#F0F8F3] text-saveful-green"
          : "border-black/[0.08] bg-[#FBFBF8] text-gray-700 hover:bg-white",
      )}
    >
      {icon ? <ListingIcon src={icon} className="h-4 w-4" /> : null}
      {label}
      {active ? <Check className="h-3.5 w-3.5" /> : null}
    </button>
  );
}

function SummaryRow({
  icon: Icon,
  text,
  farm,
}: {
  icon: typeof MapPin;
  text: string;
  farm?: boolean;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", farm ? "text-orange-600" : "text-saveful-green")} />
      <p className="font-saveful-semibold text-sm text-gray-700">{text}</p>
    </div>
  );
}
