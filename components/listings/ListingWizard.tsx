"use client";

import { useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  CircleHelp,
  Clock,
  Flame,
  Leaf,
  MapPin,
  Snowflake,
  TriangleAlert,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { PortalShell } from "@/components/layout/PortalShell";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { demoOrganization, demoSites } from "@/lib/demo";
import {
  ALLERGEN_OPTIONS,
  CONTAMINANT_OPTIONS,
  FARM_ITEMS,
  FARM_STORAGE,
  PEOPLE_ITEMS,
  PEOPLE_REHEAT,
  PEOPLE_STORAGE,
  STEP_META,
  estimateMealsSaved,
  formatCo2AvoidedKg,
  formatDate,
  formatDateShort,
  formatQty,
  formatTime,
  getFoodItemsError,
  getListingDateErrors,
  parseDateTimeValue,
  parseDateValue,
  parseTimeValue,
  toDateTimeValue,
  toDateValue,
  toTimeValue,
  type FoodItem,
  type ListingFieldErrors,
  type ListingKind,
  type ListingStep,
} from "@/lib/listingForm";

const TERMS_URL = "https://www.saveful.com/saveful-for-business-terms-conditions";

const creamInput =
  "w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-3 py-2.5 font-saveful text-sm text-[#1a1a1a] outline-none transition focus:border-[#A68FD9] focus:bg-white";

export function ListingWizard({ kind }: { kind: ListingKind }) {
  const router = useRouter();
  const isFarm = kind === "farm";
  const accent = isFarm ? "orange" : "green";
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<ListingStep>(1);
  const [siteId, setSiteId] = useState(demoSites[0]?.id ?? "");
  const selectedSite = demoSites.find((site) => site.id === siteId) ?? demoSites[0];

  const [items, setItems] = useState<FoodItem[]>(
    () => (isFarm ? FARM_ITEMS : PEOPLE_ITEMS).map((item) => ({ ...item })),
  );
  const [customItem, setCustomItem] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);

  const [location, setLocation] = useState(
    [selectedSite?.address, selectedSite?.postCode].filter(Boolean).join(" "),
  );
  const [bestBefore, setBestBefore] = useState<Date | null>(null);
  const [bestBeforeTimeSet, setBestBeforeTimeSet] = useState(false);
  const [pickupFrom, setPickupFrom] = useState<Date | null>(null);
  const [pickupTo, setPickupTo] = useState<Date | null>(null);

  const [storage, setStorage] = useState<string | null>(null);
  const [reheating, setReheating] = useState<string | null>(null);
  const [farmStorage, setFarmStorage] = useState<string[]>([]);
  const [contaminants, setContaminants] = useState<string[]>([]);
  const [allergens, setAllergens] = useState<string[]>([]);
  const [confirmedSafe, setConfirmedSafe] = useState(false);
  const [errors, setErrors] = useState<ListingFieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  const activeItems = useMemo(() => items.filter((item) => item.qty > 0), [items]);
  const totalQuantity = useMemo(
    () => items.reduce((sum, item) => sum + item.qty, 0),
    [items],
  );

  const updateQty = (index: number, delta: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, qty: Math.max(0, Math.round((item.qty + delta) * 10) / 10) }
          : item,
      ),
    );
    setErrors((prev) => ({ ...prev, foodItems: undefined }));
  };

  const addCustomItem = () => {
    if (!customItem.trim()) return;
    setItems((prev) => [
      ...prev,
      {
        name: customItem.trim(),
        qty: 0,
        icon: isFarm ? "/listing/veggie_basket.png" : "/listing/meal_icon.png",
      },
    ]);
    setCustomItem("");
  };

  const addPhotos = (files: FileList | null) => {
    if (!files?.length) return;
    const next = Array.from(files).map((file) => URL.createObjectURL(file));
    setPhotos((prev) => [...prev, ...next]);
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const url = prev[index];
      if (url) URL.revokeObjectURL(url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSiteChange = (id: string) => {
    setSiteId(id);
    const site = demoSites.find((entry) => entry.id === id);
    if (site) {
      setLocation([site.address, site.postCode].filter(Boolean).join(" "));
    }
  };

  const handleBack = () => {
    if (step === 3) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(1);
      return;
    }
    router.push("/listings/new");
  };

  const handleContinue = () => {
    if (step === 1) {
      const foodError = getFoodItemsError(totalQuantity);
      if (foodError) {
        setErrors({ foodItems: foodError });
        return;
      }
      setErrors({});
      setStep(2);
      return;
    }

    if (step === 2) {
      const nextErrors = getListingDateErrors(bestBefore, pickupFrom, pickupTo);
      if (!location.trim()) nextErrors.location = "Please enter a pickup address.";
      if (!isFarm && !storage) nextErrors.storage = "Please select a storage requirement.";
      if (!isFarm && !reheating) nextErrors.reheating = "Please select whether reheating is required.";
      if (Object.values(nextErrors).some(Boolean)) {
        setErrors(nextErrors);
        return;
      }
      setErrors({});
      setStep(3);
    }
  };

  const handleCreate = () => {
    if (!confirmedSafe) {
      setErrors({
        confirmedSafe: isFarm
          ? "Please confirm this material is only for agricultural reuse."
          : "Please confirm this food is safe for donation.",
      });
      return;
    }
    setSubmitting(true);
    window.setTimeout(() => {
      router.push("/listings");
    }, 400);
  };

  return (
    <PortalShell>
      <div className="h-full overflow-y-auto bg-[#F7F6F2] p-4 md:p-8">
        <div className="mx-auto w-full max-w-2xl space-y-5 pb-8">
          <header className="rounded-2xl border border-gray-100 bg-white px-4 py-5 text-center shadow-sm sm:px-6">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={handleBack}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-saveful-green hover:bg-gray-50"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div className="relative h-10 w-10 overflow-hidden rounded-full bg-white ring-1 ring-black/5">
                <Image src="/notification_icon.png" alt="Saveful" fill className="object-contain p-1.5" />
              </div>
            </div>
            <Image
              src={isFarm ? "/listing/farmhouse.png" : "/listing/people_icon.png"}
              alt=""
              width={96}
              height={96}
              className="mx-auto h-16 w-16 object-contain sm:h-20 sm:w-20"
            />
            <h1 className="mt-2 font-saveful-bold text-2xl text-gray-900">
              {isFarm ? "Surplus for Farm & Recovery" : "Surplus for people"}
            </h1>
            <p className="mt-1 font-saveful text-sm text-gray-500">
              {isFarm
                ? "Food scraps and surplus for livestock and agricultural reuse"
                : "Helping good food go further"}
            </p>
            <Stepper step={step} accent={accent} onSelect={(id) => id <= step && setStep(id)} />
          </header>

          {step === 1 ? (
            <div className="space-y-4">
              <Section title="Which site?">
                <select
                  value={siteId}
                  onChange={(event) => handleSiteChange(event.target.value)}
                  className={creamInput}
                >
                  {demoSites.map((site) => (
                    <option key={site.id} value={site.id}>
                      {site.name}
                    </option>
                  ))}
                </select>
              </Section>

              <Section title="What food do you have?">
                <div className="mb-1 flex justify-end font-saveful text-xs uppercase tracking-wide text-gray-400">
                  KG
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <Image src={item.icon} alt="" width={36} height={36} className="h-9 w-9 object-contain" />
                        <p className="font-saveful text-sm text-gray-700">{item.name}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <QtyButton onClick={() => updateQty(index, -0.5)}>-</QtyButton>
                        <span className="w-8 text-center font-saveful-semibold text-sm tabular-nums text-gray-800">
                          {formatQty(item.qty)}
                        </span>
                        <QtyButton onClick={() => updateQty(index, 0.5)}>+</QtyButton>
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
                        addCustomItem();
                      }
                    }}
                    placeholder="Add other item..."
                    className={creamInput}
                  />
                  <button
                    type="button"
                    onClick={addCustomItem}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-saveful-green font-saveful-bold text-white"
                  >
                    +
                  </button>
                </div>
              </Section>

              <Section title="Quantity (kg)">
                <div className="rounded-2xl bg-[#F5F1E8] px-4 py-4 text-center">
                  <p className="font-saveful-bold text-3xl tabular-nums text-gray-900">
                    {formatQty(totalQuantity)} KG
                  </p>
                </div>
                <p className="mt-2 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  Estimate total weight of surplus food
                </p>
                {errors.foodItems ? <ErrorText>{errors.foodItems}</ErrorText> : null}
              </Section>

              <Section title="Add photo (optional)">
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(event) => {
                    addPhotos(event.target.files);
                    event.target.value = "";
                  }}
                />
                {photos.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => galleryRef.current?.click()}
                    className="flex h-28 w-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-[#F5F1E8] text-3xl text-gray-400"
                  >
                    +
                  </button>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {photos.map((url, index) => (
                      <div key={url} className="relative aspect-square overflow-hidden rounded-xl">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <p className="mt-2 font-saveful text-xs text-gray-400">
                  {photos.length} photo(s) selected
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Button
                    variant="secondary"
                    className="w-full"
                    onClick={() => galleryRef.current?.click()}
                  >
                    Gallery
                  </Button>
                  <Button className="w-full" onClick={() => cameraRef.current?.click()}>
                    Camera
                  </Button>
                </div>
                <p className="mt-2 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  Photos help charities plan collections
                </p>
              </Section>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <Section title="Pickup location">
                <input
                  value={location}
                  onChange={(event) => {
                    setLocation(event.target.value);
                    setErrors((prev) => ({ ...prev, location: undefined }));
                  }}
                  placeholder="Enter pickup address"
                  className={creamInput}
                />
                {errors.location ? <ErrorText>{errors.location}</ErrorText> : null}
              </Section>

              <Section title="Food best before">
                {isFarm ? (
                  <label className="flex items-center gap-3 rounded-xl bg-[#F5F1E8] px-3 py-3">
                    <Calendar className={cn("h-4 w-4", isFarm ? "text-saveful-orange" : "text-saveful-green")} />
                    <input
                      type="date"
                      value={toDateValue(bestBefore)}
                      min={toDateValue(new Date())}
                      onChange={(event) => {
                        setBestBefore(parseDateValue(event.target.value, bestBefore));
                        setErrors((prev) => ({ ...prev, bestBefore: undefined }));
                      }}
                      className="w-full bg-transparent font-saveful-semibold text-sm outline-none"
                    />
                  </label>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <DateBox label="Date">
                      <Calendar className="h-4 w-4 text-saveful-green" />
                      <input
                        type="date"
                        value={toDateValue(bestBefore)}
                        min={toDateValue(new Date())}
                        onChange={(event) => {
                          setBestBefore(parseDateValue(event.target.value, bestBefore));
                          setErrors((prev) => ({ ...prev, bestBefore: undefined }));
                        }}
                        className="w-full min-w-0 bg-transparent font-saveful-semibold text-sm outline-none"
                      />
                    </DateBox>
                    <DateBox label="Time (optional)">
                      <Clock className="h-4 w-4 text-saveful-green" />
                      <input
                        type="time"
                        value={bestBeforeTimeSet ? toTimeValue(bestBefore) : ""}
                        onChange={(event) => {
                          setBestBeforeTimeSet(Boolean(event.target.value));
                          setBestBefore(parseTimeValue(event.target.value, bestBefore));
                        }}
                        className="w-full min-w-0 bg-transparent font-saveful-semibold text-sm outline-none"
                      />
                      {bestBeforeTimeSet ? (
                        <button
                          type="button"
                          className="shrink-0 font-saveful text-xs text-saveful-green"
                          onClick={() => {
                            setBestBeforeTimeSet(false);
                            if (bestBefore) {
                              const cleared = new Date(bestBefore);
                              cleared.setHours(23, 59, 0, 0);
                              setBestBefore(cleared);
                            }
                          }}
                        >
                          Clear
                        </button>
                      ) : null}
                    </DateBox>
                  </div>
                )}
                {errors.bestBefore ? <ErrorText>{errors.bestBefore}</ErrorText> : null}
              </Section>

              <Section title="Pickup window">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <DateBox label="From">
                    <input
                      type="datetime-local"
                      value={toDateTimeValue(pickupFrom)}
                      onChange={(event) => {
                        setPickupFrom(parseDateTimeValue(event.target.value));
                        setErrors((prev) => ({ ...prev, pickupFrom: undefined }));
                      }}
                      className="w-full bg-transparent font-saveful-semibold text-sm outline-none"
                    />
                  </DateBox>
                  <DateBox label="To">
                    <input
                      type="datetime-local"
                      value={toDateTimeValue(pickupTo)}
                      onChange={(event) => {
                        setPickupTo(parseDateTimeValue(event.target.value));
                        setErrors((prev) => ({ ...prev, pickupTo: undefined }));
                      }}
                      className="w-full bg-transparent font-saveful-semibold text-sm outline-none"
                    />
                  </DateBox>
                </div>
                {errors.pickupFrom ? <ErrorText>{errors.pickupFrom}</ErrorText> : null}
                {errors.pickupTo ? <ErrorText>{errors.pickupTo}</ErrorText> : null}
              </Section>

              {isFarm ? (
                <>
                  <Section title="Storage / handling">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {FARM_STORAGE.map((option) => {
                        const active = farmStorage.includes(option.label);
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() =>
                              setFarmStorage((prev) =>
                                prev.includes(option.label)
                                  ? prev.filter((item) => item !== option.label)
                                  : [...prev, option.label],
                              )
                            }
                            className={cn(
                              "relative flex min-h-[88px] flex-col items-center justify-center gap-1.5 rounded-2xl border px-2 py-3 text-center",
                              active
                                ? "border-saveful-orange bg-orange-50"
                                : "border-gray-100 bg-[#F5F1E8]",
                            )}
                          >
                            {active ? (
                              <Check className="absolute right-2 top-2 h-3.5 w-3.5 text-saveful-orange" />
                            ) : null}
                            {option.icon ? (
                              <Image src={option.icon} alt="" width={22} height={22} className="h-5 w-5 object-contain" />
                            ) : null}
                            <span
                              className={cn(
                                "font-saveful text-xs",
                                active ? "text-saveful-orange" : "text-gray-600",
                              )}
                            >
                              {option.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                  <Section title="Possible contaminants — select all that apply">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {CONTAMINANT_OPTIONS.map((label) => {
                        const active = contaminants.includes(label);
                        return (
                          <button
                            key={label}
                            type="button"
                            onClick={() =>
                              setContaminants((prev) =>
                                prev.includes(label)
                                  ? prev.filter((item) => item !== label)
                                  : [...prev, label],
                              )
                            }
                            className={cn(
                              "relative min-h-[72px] rounded-2xl border px-3 py-3 text-left font-saveful-semibold text-sm",
                              active
                                ? "border-saveful-orange bg-orange-50 text-saveful-orange"
                                : "border-gray-100 bg-[#F5F1E8] text-gray-600",
                            )}
                          >
                            {active ? (
                              <Check className="absolute right-2 top-2 h-3.5 w-3.5" />
                            ) : null}
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </Section>
                </>
              ) : (
                <>
                  <Section title="Storage requirements">
                    <div className="flex flex-wrap gap-2">
                      {PEOPLE_STORAGE.map((option) => {
                        const active = storage === option.label;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => {
                              setStorage(option.label);
                              setErrors((prev) => ({ ...prev, storage: undefined }));
                            }}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-saveful-semibold text-sm",
                              active
                                ? "border-saveful-green bg-saveful-green/10 text-saveful-green"
                                : "border-gray-200 bg-white text-gray-700",
                            )}
                          >
                            <Image src={option.icon} alt="" width={16} height={16} className="h-4 w-4" />
                            {option.label}
                            {active ? <Check className="h-3.5 w-3.5" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    {errors.storage ? <ErrorText>{errors.storage}</ErrorText> : null}
                  </Section>

                  <Section title="Reheating required?">
                    <div className="flex flex-wrap gap-2">
                      {PEOPLE_REHEAT.map((option) => {
                        const active = reheating === option.label;
                        return (
                          <button
                            key={option.label}
                            type="button"
                            onClick={() => {
                              setReheating(option.label);
                              setErrors((prev) => ({ ...prev, reheating: undefined }));
                            }}
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full border px-3 py-2 font-saveful-semibold text-sm",
                              active
                                ? "border-saveful-green bg-saveful-green/10 text-saveful-green"
                                : "border-gray-200 bg-white text-gray-500",
                            )}
                          >
                            {option.icon ? (
                              <Image src={option.icon} alt="" width={16} height={16} className="h-4 w-4" />
                            ) : (
                              <CircleHelp className="h-4 w-4" />
                            )}
                            {option.label}
                          </button>
                        );
                      })}
                    </div>
                    {errors.reheating ? <ErrorText>{errors.reheating}</ErrorText> : null}
                  </Section>

                  <Section title="Allergens (optional)">
                    <div className="mb-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAllergens([...ALLERGEN_OPTIONS])}
                        className="font-saveful-semibold text-sm text-saveful-green"
                      >
                        Select all
                      </button>
                      <button
                        type="button"
                        onClick={() => setAllergens([])}
                        className="font-saveful-semibold text-sm text-gray-400"
                      >
                        Clear
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {ALLERGEN_OPTIONS.map((allergen) => {
                        const active = allergens.includes(allergen);
                        return (
                          <button
                            key={allergen}
                            type="button"
                            onClick={() =>
                              setAllergens((prev) =>
                                prev.includes(allergen)
                                  ? prev.filter((item) => item !== allergen)
                                  : [...prev, allergen],
                              )
                            }
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-saveful text-xs",
                              active
                                ? "border-saveful-green bg-saveful-green/10 text-saveful-green"
                                : "border-gray-200 bg-white text-gray-500",
                            )}
                          >
                            {allergen}
                            {active ? <Check className="h-3 w-3" /> : null}
                          </button>
                        );
                      })}
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Image src="/listing/allergen_icon.png" alt="" width={18} height={18} />
                      <p className="font-saveful-semibold text-sm text-gray-600">
                        {allergens.length ? allergens.join(", ") : "No allergens selected"}
                      </p>
                    </div>
                  </Section>
                </>
              )}
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <Section title="Food summary">
                <div className="mb-2 flex justify-between font-saveful-semibold text-[11px] uppercase tracking-wide text-gray-400">
                  <span>Item name</span>
                  <span>Available</span>
                </div>
                {(activeItems.length ? activeItems : []).map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 py-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <Image src={item.icon} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
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
                  Total Quantity: {formatQty(totalQuantity)} kg
                </p>
              </Section>

              {photos.length ? (
                <Section title="Photos">
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((url) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={url} src={url} alt="" className="aspect-square rounded-xl object-cover" />
                    ))}
                  </div>
                </Section>
              ) : null}

              <Section title="Collection summary">
                <SummaryRow icon={MapPin} text={location || "Address not provided"} accent={accent} />
                <SummaryRow
                  icon={Calendar}
                  text={`Best Before - ${formatDate(bestBefore)}${!isFarm && bestBeforeTimeSet ? ` · ${formatTime(bestBefore)}` : ""}`}
                  accent={accent}
                />
                <SummaryRow
                  icon={Clock}
                  text={`Pick up - ${formatDateShort(pickupFrom)} ${formatTime(pickupFrom)} to ${formatDateShort(pickupTo)} ${formatTime(pickupTo)}`}
                  accent={accent}
                />
                {isFarm
                  ? farmStorage.map((item) => (
                      <SummaryRow key={item} icon={Snowflake} text={item} accent={accent} />
                    ))
                  : (
                    <>
                      <SummaryRow icon={Snowflake} text={storage || "Not selected"} accent={accent} />
                      <SummaryRow icon={Flame} text={`Reheating - ${reheating || "Not selected"}`} accent={accent} />
                      <SummaryRow
                        icon={TriangleAlert}
                        text={`Allergens - ${allergens.length ? allergens.join(", ") : "None selected"}`}
                        accent={accent}
                      />
                    </>
                  )}
                {isFarm && contaminants.length ? (
                  <SummaryRow icon={TriangleAlert} text={contaminants.join(", ")} accent={accent} />
                ) : null}
              </Section>

              <button
                type="button"
                onClick={() => {
                  setConfirmedSafe((prev) => !prev);
                  setErrors((prev) => ({ ...prev, confirmedSafe: undefined }));
                }}
                className="flex items-start gap-3 text-left"
              >
                <span
                  className={cn(
                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border",
                    confirmedSafe
                      ? isFarm
                        ? "border-saveful-orange bg-saveful-orange text-white"
                        : "border-saveful-green bg-saveful-green text-white"
                      : "border-gray-300 bg-white",
                  )}
                >
                  {confirmedSafe ? <Check className="h-3.5 w-3.5" /> : null}
                </span>
                <p className="font-saveful text-sm leading-relaxed text-gray-600">
                  {isFarm
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
              {errors.confirmedSafe ? <ErrorText>{errors.confirmedSafe}</ErrorText> : null}

              <div className="rounded-2xl border border-saveful-green/20 bg-[#EEF4EE] p-4">
                <p className="font-saveful-bold text-sm text-saveful-green">Your Impact</p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div className="text-center">
                    {isFarm ? (
                      <Leaf className="mx-auto h-5 w-5 text-saveful-green" />
                    ) : (
                      <UtensilsCrossed className="mx-auto h-5 w-5 text-saveful-green" />
                    )}
                    <p className="mt-1 font-saveful-bold text-xl text-saveful-green">
                      {isFarm ? formatQty(totalQuantity) : estimateMealsSaved(totalQuantity)}
                    </p>
                    <p className="font-saveful text-xs text-saveful-green">
                      {isFarm ? "Kg food provided" : "meals saved"}
                    </p>
                  </div>
                  <div className="text-center">
                    <Leaf className="mx-auto h-5 w-5 text-saveful-green" />
                    <p className="mt-1 font-saveful-bold text-xl text-saveful-green">
                      {formatCo2AvoidedKg(totalQuantity)}kg
                    </p>
                    <p className="font-saveful text-xs text-saveful-green">CO2 avoided</p>
                  </div>
                </div>
                {!isFarm ? (
                  <p className="mt-2 text-center font-saveful text-xs text-saveful-green">420g = 1 meal</p>
                ) : null}
              </div>
            </div>
          ) : null}

          <Button
            className={cn(
              "h-12 w-full text-sm uppercase tracking-wide",
              isFarm && "bg-saveful-orange hover:bg-orange-600",
            )}
            onClick={step === 3 ? handleCreate : handleContinue}
            disabled={submitting}
          >
            {step === 3
              ? submitting
                ? "Creating..."
                : isFarm
                  ? "Create listing"
                  : "Create charity listing"
              : "Continue"}
            {!submitting ? <ArrowRight className="h-4 w-4" /> : null}
          </Button>
          <p className="text-center font-saveful text-xs text-gray-400">
            Listing from {selectedSite?.name || demoOrganization.name}
          </p>
        </div>
      </div>
    </PortalShell>
  );
}

function Stepper({
  step,
  accent,
  onSelect,
}: {
  step: ListingStep;
  accent: "green" | "orange";
  onSelect: (id: ListingStep) => void;
}) {
  const activeClass = accent === "orange" ? "bg-saveful-orange border-saveful-orange" : "bg-saveful-green border-saveful-green";
  const lineClass = accent === "orange" ? "bg-saveful-orange" : "bg-saveful-green";

  return (
    <div className="mt-5">
      <div className="flex items-center justify-center">
        {STEP_META.map((entry, index) => {
          const done = step >= entry.id;
          return (
            <div key={entry.id} className="flex items-center">
              <button
                type="button"
                onClick={() => onSelect(entry.id)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 font-saveful-bold text-xs",
                  done ? `${activeClass} text-white` : "border-gray-300 bg-white text-gray-400",
                )}
              >
                {entry.id}
              </button>
              {index < STEP_META.length - 1 ? (
                <div className={cn("mx-2 h-0.5 w-10 sm:w-16", step > entry.id ? lineClass : "bg-gray-300")} />
              ) : null}
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-3 text-center">
        {STEP_META.map((entry) => (
          <p key={entry.id} className="font-saveful-semibold text-[11px] leading-tight text-gray-700 sm:text-xs">
            {entry.title}
          </p>
        ))}
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
      <h2 className="mb-3 font-saveful-bold text-xs uppercase tracking-[0.14em] text-gray-900">
        {title}
      </h2>
      {children}
    </section>
  );
}

function QtyButton({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white text-lg leading-none text-gray-500 hover:bg-gray-50"
    >
      {children}
    </button>
  );
}

function DateBox({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-[#F5F1E8] px-3 py-3">
      <p className="mb-1 font-saveful text-[10px] uppercase tracking-wide text-gray-400">{label}</p>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return <p className="mt-2 font-saveful text-xs text-red-600">{children}</p>;
}

function SummaryRow({
  icon: Icon,
  text,
  accent,
}: {
  icon: typeof MapPin;
  text: string;
  accent: "green" | "orange";
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", accent === "orange" ? "text-saveful-orange" : "text-saveful-green")} />
      <p className="font-saveful-semibold text-sm text-gray-700">{text}</p>
    </div>
  );
}
