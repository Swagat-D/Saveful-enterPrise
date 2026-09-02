"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  Star,
  UserRound,
  X,
} from "lucide-react";
import { LISTING_ICONS, ListingIcon, foodItemIcon } from "@/components/business/ListingIcon";
import { PostPickupSurveyModal } from "@/components/business/PostPickupSurveyModal";
import { PortalPageHeader, PortalPageShell } from "@/components/ui/Portal";
import { listBusinessListings } from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import { estimateMealsSaved, listingsFromPayload } from "@/lib/businessListings";
import {
  formatCollectedDate,
  formatCollectionDate,
  formatCollectionTimeRange,
  mapListingsToRestaurantUpdates,
  parseStarRating,
  prettyStatus,
  type RestaurantUpdate,
  type UpdateAudience,
} from "@/lib/businessUpdates";
import { cn } from "@/lib/utils";

type UpdateFilter = "all" | "people" | "animals";

type UpdateTheme = {
  accent: string;
  statusBg: string;
  lightBg: string;
  categoryLabel: string;
  categoryIcon: string;
  border: string;
};

const PEOPLE_THEME: UpdateTheme = {
  accent: "#3A7E52",
  statusBg: "#D8EBDF",
  lightBg: "#F2F8F4",
  categoryLabel: "For People",
  categoryIcon: LISTING_ICONS.people,
  border: "#3A7E52",
};

const ANIMAL_THEME: UpdateTheme = {
  accent: "#F99C46",
  statusBg: "#FFE8CC",
  lightBg: "#FFF8F0",
  categoryLabel: "For Animals",
  categoryIcon: LISTING_ICONS.animals,
  border: "#F99C46",
};

function getTheme(audience: UpdateAudience): UpdateTheme {
  return audience === "animals" ? ANIMAL_THEME : PEOPLE_THEME;
}

function RatingSummary({
  rating,
  label = "Your rating",
  note,
  variant = "star",
  color = "#F99C46",
}: {
  rating?: number | null;
  label?: string;
  note?: string | null;
  variant?: "star" | "apple";
  color?: string;
}) {
  const value = parseStarRating(rating);
  if (value == null) return null;

  return (
    <div className="space-y-0.5">
      <p className="font-saveful text-[10px] uppercase tracking-[0.4px] text-gray-500">{label}</p>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) =>
          variant === "apple" ? (
            <span key={n} className={cn("text-sm", n <= value ? "opacity-100" : "opacity-30")}>
              🍎
            </span>
          ) : (
            <Star
              key={n}
              className={cn("h-3.5 w-3.5", n <= value ? "fill-current" : "")}
              style={{ color }}
            />
          ),
        )}
        <span className="ml-1 font-saveful-semibold text-xs" style={{ color }}>
          {value}/5
        </span>
      </div>
      {note ? <p className="font-saveful text-xs text-gray-500">{note}</p> : null}
    </div>
  );
}

function CardHeadline({ primary, secondary }: { primary: string; secondary: string }) {
  return (
    <div className="min-w-0">
      <h3 className="font-saveful-semibold text-[16px] leading-snug text-gray-900">{primary}</h3>
      <p className="font-saveful text-[13px] leading-snug text-gray-500">{secondary}</p>
    </div>
  );
}

function DetailTile({
  theme,
  icon,
  label,
  value,
  sub,
}: {
  theme: UpdateTheme;
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-[10px] border border-[#EFE8DC] bg-[#FAFAF8] px-2.5 py-2">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
        style={{ backgroundColor: theme.statusBg }}
      >
        <ListingIcon src={icon} className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="font-saveful-semibold text-[9px] uppercase tracking-[0.5px] text-gray-400">{label}</p>
        <p className="truncate font-saveful-semibold text-[13px] leading-tight text-gray-900">{value}</p>
        {sub ? <p className="truncate font-saveful text-[11px] text-gray-500">{sub}</p> : null}
      </div>
    </div>
  );
}

function cardWeight(item: RestaurantUpdate) {
  if (item.cardType === "feedback") return 2;
  if (item.cardType === "claimed") return 6;
  const rated = item.providerRating != null || item.claimantRating != null;
  const needsRate = Boolean(item.needsProviderFeedback);
  return 3 + (rated ? 2 : 0) + (needsRate ? 1 : 0);
}

function packUpdateColumns(items: RestaurantUpdate[]) {
  const columns: [RestaurantUpdate[], RestaurantUpdate[]] = [[], []];
  const heights = [0, 0];
  for (const item of items) {
    const target = heights[0] <= heights[1] ? 0 : 1;
    columns[target].push(item);
    heights[target] += cardWeight(item);
  }
  return columns;
}

function cardShell(theme: UpdateTheme, audience: UpdateAudience, children: ReactNode) {
  return (
    <article
      className="overflow-hidden rounded-[14px] border bg-white"
      style={{
        borderColor: theme.border,
        backgroundColor: audience === "animals" ? theme.lightBg : "#fff",
      }}
    >
      <div className="flex flex-col gap-3 p-4">{children}</div>
    </article>
  );
}

export function BusinessUpdatesView() {
  const user = useBusinessSession();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [updates, setUpdates] = useState<RestaurantUpdate[]>([]);
  const [updateFilter, setUpdateFilter] = useState<UpdateFilter>("all");
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [impactModalVisible, setImpactModalVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<{ name: string; qty: string }[]>([]);
  const [selectedImpact, setSelectedImpact] = useState<RestaurantUpdate | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<number | null>(null);
  const [selectedPartnerName, setSelectedPartnerName] = useState("your partner");
  const [selectedSurveyItems, setSelectedSurveyItems] = useState<
    { id: string; name: string; quantity: number }[]
  >([]);
  const [initialAnswer, setInitialAnswer] = useState<"yes" | "no" | null>(null);
  const [surveyCompletedIds, setSurveyCompletedIds] = useState<string[]>([]);

  const loadUpdates = useCallback(async () => {
    if (!user) return;
    setLoadError(null);
    try {
      const payload = await listBusinessListings(user.organisationId);
      setUpdates(mapListingsToRestaurantUpdates(listingsFromPayload(payload)));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load your updates. Try again.");
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadUpdates();
  }, [loadUpdates]);

  const peopleCount = useMemo(() => updates.filter((item) => item.audience === "people").length, [updates]);
  const animalCount = useMemo(() => updates.filter((item) => item.audience === "animals").length, [updates]);

  const filteredUpdates = useMemo(() => {
    if (updateFilter === "people") return updates.filter((item) => item.audience === "people");
    if (updateFilter === "animals") return updates.filter((item) => item.audience === "animals");
    return updates;
  }, [updates, updateFilter]);

  const sections = useMemo(() => {
    return (["TODAY", "YESTERDAY", "EARLIER"] as const)
      .map((title) => ({ title, data: filteredUpdates.filter((item) => item.section === title) }))
      .filter((section) => section.data.length > 0);
  }, [filteredUpdates]);

  const openProviderSurvey = (item: RestaurantUpdate, answer: "yes" | "no" | null = null) => {
    setSelectedId(item.id);
    setSelectedClaimId(item.claimId);
    setSelectedPartnerName(item.claimerName || "your partner");
    setSelectedSurveyItems(
      (item.items || []).map((food, index) => ({
        id: String(index),
        name: food.name,
        quantity: Number.parseFloat(String(food.qty).replace(/[^\d.]/g, "")) || 0,
      })),
    );
    setInitialAnswer(answer);
    setModalVisible(true);
  };

  const contactHref = (kind: "tel" | "sms", phone?: string | null) => {
    if (!phone) return null;
    return kind === "tel" ? `tel:${phone.replace(/[^+\d]/g, "")}` : `sms:${phone}`;
  };

  const renderClaimedCard = (item: RestaurantUpdate) => {
    const theme = getTheme(item.audience);
    const statusLabel = prettyStatus(item.assigneeStatus || "");
    const claimerLabel = item.audience === "animals" ? "Farmer" : "Charity";
    const assigneeLabel = item.assigneeLabel ?? "Driver";
    const hasCollectionWindow = Boolean(item.pickupFrom && item.pickupTo);
    const claimerCall = contactHref("tel", item.claimerPhone);
    const claimerMsg = contactHref("sms", item.claimerPhone);
    const assigneeCall = contactHref("tel", item.assigneePhone);
    const assigneeMsg = contactHref("sms", item.assigneePhone);

    return cardShell(
      theme,
      item.audience,
      <>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-md px-2.5 py-1 font-saveful-semibold text-[10px] uppercase tracking-[0.4px]"
            style={{ backgroundColor: theme.statusBg, color: theme.accent }}
          >
            Claimed
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-saveful-semibold text-[10px] uppercase tracking-[0.4px]"
            style={{ backgroundColor: theme.statusBg, color: theme.accent }}
          >
            <ListingIcon src={theme.categoryIcon} className="h-3 w-3" />
            {theme.categoryLabel}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-saveful-semibold text-[10px] uppercase tracking-[0.4px]"
            style={{ borderColor: `${theme.accent}80`, color: theme.accent }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: theme.accent }} />
            {statusLabel}
          </span>
        </div>

        <CardHeadline primary={item.claimerName ?? "Someone"} secondary="claimed your listing" />

        <div className="space-y-1">
          {item.location ? (
            <p className="flex items-start gap-1.5 font-saveful text-[13px] text-gray-500">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: theme.accent }} />
              <span className="min-w-0 leading-snug">{item.location}</span>
            </p>
          ) : null}
          <p className="flex items-center gap-1.5 font-saveful text-[13px] text-gray-500">
            {item.assigneeLabel === "Farmer" ? (
              <UserRound className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accent }} />
            ) : (
              <Navigation className="h-3.5 w-3.5 shrink-0" style={{ color: theme.accent }} />
            )}
            <span className="truncate">
              {item.assigneeName ? `${item.assigneeLabel}: ${item.assigneeName}` : `${item.assigneeLabel} not assigned yet`}
            </span>
          </p>
        </div>

        <div className="h-px bg-[#EFE8DC]" />

        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="grid min-w-0 flex-1 grid-cols-2 gap-2">
            <DetailTile
              theme={theme}
              icon={LISTING_ICONS.calendar}
              label="Collection"
              value={hasCollectionWindow ? formatCollectionDate(item.pickupFrom!) : "Window TBC"}
              sub={hasCollectionWindow ? formatCollectionTimeRange(item.pickupFrom!, item.pickupTo!) : undefined}
            />
            <DetailTile theme={theme} icon={LISTING_ICONS.items} label="Quantity" value={`${item.quantityKg} kg`} />
          </div>
          <button
            type="button"
            onClick={() => {
              setSelectedItems(item.items || []);
              setDetailsModalVisible(true);
            }}
            className="inline-flex items-center justify-center gap-1 rounded-[10px] border-[1.5px] px-3 py-2.5 font-saveful-semibold text-sm sm:w-[8.5rem] sm:shrink-0"
            style={{ borderColor: `${theme.accent}80`, color: theme.accent }}
          >
            View Items
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>

        <div className="h-px bg-[#EFE8DC]" />

        <div className="grid grid-cols-2 gap-3">
          <div className="min-w-0">
            <p className="font-saveful-semibold text-[10px] uppercase tracking-[0.8px] text-gray-400">{claimerLabel}</p>
            <div className="mt-1.5 flex gap-1.5">
              <ContactAction href={claimerCall} label="Call" accent={theme.accent} icon={<Phone className="h-3.5 w-3.5" />} />
              <ContactAction href={claimerMsg} label="Msg" accent={theme.accent} icon={<MessageCircle className="h-3.5 w-3.5" />} />
            </div>
          </div>
          <div className="min-w-0 border-l border-[#EFE8DC] pl-3">
            <p className="font-saveful-semibold text-[10px] uppercase tracking-[0.8px] text-gray-400">{assigneeLabel}</p>
            <div className="mt-1.5 flex gap-1.5">
              <ContactAction href={assigneeCall} label="Call" accent={theme.accent} icon={<Phone className="h-3.5 w-3.5" />} />
              <ContactAction href={assigneeMsg} label="Msg" accent={theme.accent} icon={<MessageCircle className="h-3.5 w-3.5" />} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-[10px] px-3 py-2.5" style={{ backgroundColor: theme.statusBg }}>
          <Clock3 className="h-4 w-4 shrink-0" style={{ color: theme.accent }} />
          <p className="font-saveful-semibold text-sm" style={{ color: theme.accent }}>
            Claimed — waiting for pickup
          </p>
        </div>
      </>,
    );
  };

  const renderFeedbackCard = (item: RestaurantUpdate) => {
    const theme = getTheme(item.audience);
    const completed = surveyCompletedIds.includes(item.id);

    return cardShell(
      theme,
      item.audience,
      <>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-[#E8F1FB] px-2.5 py-1 font-saveful-semibold text-[10px] uppercase tracking-[0.4px] text-[#2F6FED]">
            Action needed
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-saveful-semibold text-[10px] uppercase tracking-[0.4px]"
            style={{ backgroundColor: theme.statusBg, color: theme.accent }}
          >
            <ListingIcon src={theme.categoryIcon} className="h-3 w-3" />
            {theme.categoryLabel}
          </span>
        </div>
        <CardHeadline
          primary={item.claimerName}
          secondary="collected your listing — please rate this collection"
        />
        <button
          type="button"
          disabled={completed}
          onClick={() => openProviderSurvey(item, "yes")}
          className="w-full rounded-xl py-3 font-saveful-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: theme.accent }}
        >
          Rate now
        </button>
      </>,
    );
  };

  const renderCollectedCard = (item: RestaurantUpdate) => {
    const theme = getTheme(item.audience);
    const meals = item.mealsCreated ?? estimateMealsSaved(item.quantityKg || 0);
    const co2 = item.co2Avoided ?? Math.round((item.quantityKg || 0) * 4);
    const impactValue = item.audience === "animals" ? `${co2} kg` : String(meals);
    const impactLabel = item.audience === "animals" ? "CO₂ avoided" : "Meals created";
    const impactIcon = item.audience === "animals" ? LISTING_ICONS.leaf : LISTING_ICONS.meals;
    const askForRating =
      Boolean(item.needsProviderFeedback) &&
      !surveyCompletedIds.includes(item.id) &&
      !surveyCompletedIds.includes(`feedback-${item.claimId}`);

    return cardShell(
      theme,
      item.audience,
      <>
        <div className="flex flex-wrap items-center gap-1.5">
          <span
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-saveful-semibold text-[10px] uppercase tracking-[0.4px]"
            style={{ backgroundColor: theme.statusBg, color: theme.accent }}
          >
            <CheckCircle2 className="h-3 w-3" />
            Collected
          </span>
          <span
            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-saveful-semibold text-[10px] uppercase tracking-[0.4px]"
            style={{ backgroundColor: theme.statusBg, color: theme.accent }}
          >
            <ListingIcon src={theme.categoryIcon} className="h-3 w-3" />
            {theme.categoryLabel}
          </span>
        </div>

        <CardHeadline primary="Listing collected" secondary="Your surplus was picked up successfully" />

        {item.providerRating != null || item.claimantRating != null ? (
          <div className="space-y-1.5">
            <RatingSummary rating={item.providerRating} variant="star" label="Your rating" note={item.ratingNote} color={theme.accent} />
            <RatingSummary rating={item.claimantRating} variant="apple" label="Partner rating" />
          </div>
        ) : null}

        <div className="h-px bg-[#EFE8DC]" />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <DetailTile
            theme={theme}
            icon={LISTING_ICONS.calendar}
            label="Collected on"
            value={item.collectedDate ? formatCollectedDate(item.collectedDate) : "—"}
          />
          <DetailTile
            theme={theme}
            icon={LISTING_ICONS.items}
            label={item.audience === "animals" ? "Feed" : "Food"}
            value={`${item.quantityKg} kg`}
          />
          <div
            className="col-span-2 flex min-w-0 items-center gap-2 rounded-[10px] border px-2.5 py-2 sm:col-span-1"
            style={{ backgroundColor: theme.lightBg, borderColor: `${theme.accent}35` }}
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]"
              style={{ backgroundColor: theme.statusBg }}
            >
              <ListingIcon src={impactIcon} className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-saveful-semibold text-[13px]" style={{ color: theme.accent }}>
                {impactValue}
              </p>
              <p className="font-saveful-semibold text-[9px] uppercase tracking-[0.5px]" style={{ color: theme.accent }}>
                {impactLabel}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {askForRating ? (
            <button
              type="button"
              onClick={() => openProviderSurvey(item, "yes")}
              className="w-full rounded-xl py-3 font-saveful-semibold text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Rate this collection
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => {
              setSelectedImpact(item);
              setImpactModalVisible(true);
            }}
            className="inline-flex items-center gap-1 font-saveful-semibold text-sm"
            style={{ color: theme.accent }}
          >
            Impact details
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </>,
    );
  };

  const renderCard = (item: RestaurantUpdate) => {
    if (item.cardType === "feedback") return renderFeedbackCard(item);
    if (item.cardType === "collected") return renderCollectedCard(item);
    return renderClaimedCard(item);
  };

  return (
    <PortalPageShell>
      <PortalPageHeader
        eyebrow="Activity"
        title="Your updates"
        description="Track claims, pickups, and collections in one place."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-saveful text-sm text-gray-600">
          {updates.length} active update{updates.length !== 1 ? "s" : ""} · {peopleCount} people · {animalCount} animals
        </p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["all", "All", updates.length, null],
              ["people", "For People", peopleCount, PEOPLE_THEME.categoryIcon],
              ["animals", "For Animals", animalCount, ANIMAL_THEME.categoryIcon],
            ] as const
          ).map(([key, label, count, icon]) => {
            const active = updateFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setUpdateFilter(key)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-3 font-saveful-semibold text-sm transition",
                  active
                    ? key === "animals"
                      ? "border-orange-300 bg-[#FFF6EC] text-orange-800"
                      : "border-[#3A7E52]/30 bg-[#E8F6EC] text-[#3A7E52]"
                    : "border-black/[0.06] bg-white text-gray-600 hover:bg-[#F7F6F2]",
                )}
              >
                {icon ? <ListingIcon src={icon} className="h-4 w-4" /> : null}
                {label}
                <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-white/70" : "bg-[#F7F6F2] text-gray-400")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {loading && updates.length === 0 ? (
        <div className="flex justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E8E2D6] border-t-[#3A7E52]" />
        </div>
      ) : sections.length === 0 ? (
        <div className="flex min-h-[36vh] items-center justify-center">
          <div className="w-full max-w-xl rounded-2xl bg-white px-6 py-16 text-center shadow-sm ring-1 ring-black/[0.04]">
            <p className="font-saveful-semibold text-gray-700">{loadError ? "Could not load updates" : "No updates yet"}</p>
            <p className="mt-1 font-saveful text-sm text-gray-500">
              {loadError ?? "When your listings are claimed or collected, they'll appear here."}
            </p>
            {loadError ? (
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void loadUpdates();
                }}
                className="mt-4 rounded-xl bg-[#3A7E52] px-4 py-2 font-saveful-semibold text-sm text-white"
              >
                Try again
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <div className="w-full space-y-7">
          {sections.map((section) => (
            <section key={section.title} className="w-full space-y-2.5">
              <h2 className="font-saveful-semibold text-sm text-gray-900">{section.title === "TODAY" ? "Today" : section.title === "YESTERDAY" ? "Yesterday" : "Earlier"}</h2>
              <div>
                <div className="space-y-4 md:hidden">
                  {section.data.map((item) => (
                    <div key={item.id}>{renderCard(item)}</div>
                  ))}
                </div>
                <div className="hidden md:grid md:grid-cols-2 md:items-start md:gap-4">
                  {packUpdateColumns(section.data).map((column, index) => (
                    <div key={column[0]?.id ?? index} className="space-y-4">
                      {column.map((item) => (
                        <div key={item.id}>{renderCard(item)}</div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      <PostPickupSurveyModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setInitialAnswer(null);
        }}
        selectedId={selectedId}
        claimId={selectedClaimId}
        partnerName={selectedPartnerName}
        items={selectedSurveyItems}
        initialAnswer={initialAnswer}
        onComplete={(id) => {
          setSurveyCompletedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
          setModalVisible(false);
          setInitialAnswer(null);
          void loadUpdates();
        }}
      />

      {detailsModalVisible ? (
        <UpdatesPortalSheet title="Food Items" onClose={() => setDetailsModalVisible(false)}>
          {selectedItems.length ? (
            <ul>
              {selectedItems.map((food, index) => (
                <li
                  key={`${food.name}-${index}`}
                  className="flex items-center gap-3 border-b border-[#F3F0E8] py-2.5 last:border-0"
                >
                  <ListingIcon src={foodItemIcon(food.name)} className="h-7 w-7 shrink-0" />
                  <p className="min-w-0 flex-1 font-saveful-semibold text-sm text-gray-900">{food.name}</p>
                  <p className="font-saveful-semibold text-sm text-gray-600">{food.qty}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center font-saveful text-sm text-gray-500">No items available</p>
          )}
        </UpdatesPortalSheet>
      ) : null}

      {impactModalVisible && selectedImpact ? (
        <ImpactDetailsModal item={selectedImpact} onClose={() => setImpactModalVisible(false)} />
      ) : null}
    </PortalPageShell>
  );
}

function ContactAction({
  href,
  label,
  accent,
  icon,
}: {
  href: string | null;
  label: string;
  accent: string;
  icon: ReactNode;
}) {
  const className =
    "inline-flex flex-1 items-center justify-center gap-1 rounded-lg border-[1.5px] bg-white px-2 py-2 font-saveful-semibold text-[10px] uppercase tracking-[0.4px]";
  if (!href) {
    return (
      <span className={cn(className, "cursor-not-allowed opacity-40")} style={{ borderColor: `${accent}70`, color: accent }}>
        {icon}
        {label}
      </span>
    );
  }
  return (
    <a href={href} className={className} style={{ borderColor: `${accent}70`, color: accent }}>
      {icon}
      {label}
    </a>
  );
}

function UpdatesPortalSheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-5 pb-6 pt-3 shadow-2xl sm:rounded-2xl sm:px-6 sm:pb-5 sm:pt-5"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E8E2D6] sm:hidden" />
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-saveful-bold text-lg text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBEBEB] text-gray-700 hover:bg-[#E0E0E0]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="h-px bg-[#EDE8DC]" />
        <div className="mt-3">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

function ImpactDetailsModal({ item, onClose }: { item: RestaurantUpdate; onClose: () => void }) {
  const theme = getTheme(item.audience);
  const meals = item.mealsCreated ?? estimateMealsSaved(item.quantityKg);
  const co2 = item.co2Avoided ?? Math.round(item.quantityKg * 4);

  return (
    <UpdatesPortalSheet title="Impact Details" onClose={onClose}>
        <div className="space-y-3.5">
          <div className="inline-flex items-center gap-2 rounded-xl px-3 py-2" style={{ backgroundColor: theme.statusBg }}>
            <ListingIcon src={theme.categoryIcon} className="h-4 w-4" />
            <span className="font-saveful-semibold text-sm" style={{ color: theme.accent }}>
              {theme.categoryLabel}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-saveful text-sm text-gray-500">Quantity rescued</p>
            <p className="font-saveful-semibold text-sm text-gray-900">{item.quantityKg} kg</p>
          </div>
          <div className="flex items-center justify-between">
            <p className="font-saveful text-sm text-gray-500">Date collected</p>
            <p className="font-saveful-semibold text-sm text-gray-900">
              {item.collectedDate ? formatCollectedDate(item.collectedDate) : "—"}
            </p>
          </div>
          {item.providerRating != null || item.claimantRating != null ? (
            <div className="space-y-2">
              <RatingSummary rating={item.providerRating} variant="star" label="Your rating" note={item.ratingNote} color={theme.accent} />
              <RatingSummary rating={item.claimantRating} variant="apple" label="Partner rating" />
            </div>
          ) : null}
          <div className="rounded-xl border px-4 py-3" style={{ backgroundColor: theme.lightBg, borderColor: `${theme.accent}40` }}>
            <p className="font-saveful-semibold text-xl" style={{ color: theme.accent }}>
              {item.audience === "people" ? `${meals} meals` : `${co2} kg CO₂`}
            </p>
            <p className="font-saveful text-[11px] uppercase tracking-[0.5px]" style={{ color: theme.accent }}>
              {item.audience === "people" ? "Created from your donation" : "Of emissions avoided"}
            </p>
          </div>
        </div>
    </UpdatesPortalSheet>
  );
}
