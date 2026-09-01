"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ClipboardList, CreditCard, Heart, BarChart3, ShieldCheck } from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { EnterpriseConsultModal } from "@/components/business/EnterpriseConsultForm";
import { PortalPageShell, StatusBadge } from "@/components/ui/Portal";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  cancelBusinessSubscription,
  cancelPendingPlanChange,
  changeBusinessPlan,
  getAvailablePlans,
  getBusinessOrganisation,
  openBillingPortal,
  previewPlanChange,
  resumeBusinessSubscription,
  startBillingCheckout,
  startBillingTrial,
} from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import { parseLiveSiteId } from "@/lib/businessHqSite";
import { useEntitlements } from "@/lib/businessBilling";
import {
  MULTI_SITE_INTRO,
  MULTI_SITE_SUCCESS_BANNER,
  SINGLE_SITE_COMPARE_SECTIONS,
  SINGLE_SITE_COMPARE_UPGRADE_POINTS,
  SINGLE_SITE_CORE_FEATURES,
  SINGLE_SITE_UPGRADE_BODY,
  SINGLE_SITE_UPGRADE_TITLE,
  TRUST_POINTS,
  billingCycleLabel,
  billingUserMessage,
  formatBillingDate,
  formatPlanPrice,
  getPlanRelation,
  hasLiveSubscription,
  isAlreadyOnPlanError,
  isNoActiveSubscriptionError,
  isPlanChangeRequiredError,
  isTrialAlreadyUsedError,
} from "@/lib/businessPlanCopy";
import { statusLabel, type AvailablePlan, type BillingCycle, type Entitlements } from "@/lib/businessTypes";

const CORE_ICONS = {
  surplus: ClipboardList,
  matching: Heart,
  impact: BarChart3,
  secure: ShieldCheck,
} as const;

export default function BusinessPlansPage() {
  return (
    <BusinessGate>
      <PlansInner />
    </BusinessGate>
  );
}

function PlansInner() {
  const user = useBusinessSession();
  const { entitlements, loading: entitlementsLoading, refresh } = useEntitlements();
  const [plans, setPlans] = useState<AvailablePlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | "portal" | "cancel" | "pending" | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [locationCount, setLocationCount] = useState<number | null>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  const isMulti = user?.role === "restaurant_multi";
  const canManage = Boolean(user?.isSuperAdmin);

  useEffect(() => {
    void getAvailablePlans()
      .then((payload) => setPlans(payload.plans ?? []))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Could not load plans."))
      .finally(() => setPlansLoading(false));
  }, []);

  useEffect(() => {
    void getBusinessOrganisation()
      .then((payload) => {
        const live = (payload.sites ?? []).filter((site) => parseLiveSiteId(site.id) && site.isActive !== false);
        setLocationCount(live.length);
      })
      .catch(() => setLocationCount(null));
  }, []);

  useEffect(() => {
    if (entitlements?.billingCycle) setCycle(entitlements.billingCycle);
  }, [entitlements?.billingCycle]);

  useEffect(() => {
    if (!compareOpen) return;
    const node = compareRef.current;
    if (!node) return;
    const timer = window.setTimeout(() => {
      node.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
    return () => window.clearTimeout(timer);
  }, [compareOpen]);

  const visible = useMemo(() => {
    const rows = isMulti ? [...plans] : plans.filter((plan) => !plan.contactSalesOnly);
    return rows.sort((a, b) => Number(a.contactSalesOnly) - Number(b.contactSalesOnly));
  }, [isMulti, plans]);

  const live = hasLiveSubscription(entitlements);
  const currentPlan = visible.find((plan) => plan.id === entitlements?.planId) ?? null;
  const currentCycle = entitlements?.billingCycle ?? "MONTHLY";
  const trialAvailable = Boolean(entitlements?.freeTrialAvailable) && !live;

  useEffect(() => {
    if (selectedId != null || !visible.length) return;
    setSelectedId(currentPlan?.id ?? visible.find((plan) => plan.isMostPopular)?.id ?? visible[0]?.id ?? null);
  }, [currentPlan?.id, selectedId, visible]);

  const startCheckout = async (plan: AvailablePlan, billingCycle: BillingCycle) => {
    try {
      const session = trialAvailable
        ? await startBillingTrial(plan.id, billingCycle)
        : await startBillingCheckout(plan.id, billingCycle);
      if (session.checkoutUrl) {
        window.location.href = session.checkoutUrl;
        return;
      }
      await refresh();
      setNotice(trialAvailable ? "Your free trial has started." : "Your plan is now active.");
    } catch (err) {
      if (trialAvailable && isTrialAlreadyUsedError(err)) {
        const paid = await startBillingCheckout(plan.id, billingCycle);
        if (paid.checkoutUrl) window.location.href = paid.checkoutUrl;
        return;
      }
      throw err;
    }
  };

  const startChange = async (plan: AvailablePlan, billingCycle: BillingCycle) => {
    const quote = await previewPlanChange(plan.id, billingCycle);
    const recurring = `${formatPlanPrice(quote.recurringAmount, quote.currency)} ${billingCycleLabel(quote.billingCycle)}`;
    const effective = formatBillingDate(quote.effectiveAt);
    const nextBilling = formatBillingDate(quote.nextBillingDate);
    const confirmed =
      quote.direction === "UPGRADE"
        ? window.confirm(
            `You'll be charged ${formatPlanPrice(quote.amountDueToday, quote.currency)} today — the cost of ${quote.planDisplayName} less credit for the unused part of your current plan.\n\n${quote.planDisplayName} then renews at ${recurring}${nextBilling ? ` from ${nextBilling}` : ""}.`,
          )
        : window.confirm(
            `Nothing is charged today. You keep your current plan until ${effective ?? "the end of this billing period"}, then move to ${quote.planDisplayName} at ${recurring}.`,
          );
    if (!confirmed) return;
    const result = await changeBusinessPlan(plan.id, billingCycle);
    await refresh();
    setNotice(result.message);
  };

  const start = async (plan: AvailablePlan) => {
    if (plan.contactSalesOnly) {
      setSalesOpen(true);
      return;
    }
    if (!canManage) {
      setError("Only an organisation Super Admin can start a trial, checkout or plan change.");
      return;
    }
    setError("");
    setNotice("");
    setBusyId(plan.id);
    try {
      if (live) {
        try {
          await startChange(plan, cycle);
        } catch (err) {
          if (isNoActiveSubscriptionError(err)) {
            await startCheckout(plan, cycle);
            return;
          }
          throw err;
        }
        return;
      }
      try {
        await startCheckout(plan, cycle);
      } catch (err) {
        if (isPlanChangeRequiredError(err)) {
          await startChange(plan, cycle);
          return;
        }
        throw err;
      }
    } catch (err) {
      if (isAlreadyOnPlanError(err)) {
        setNotice("You are already on this plan.");
        return;
      }
      setError(billingUserMessage(err));
    } finally {
      setBusyId(null);
    }
  };

  const ctaLabel = (plan: AvailablePlan) => {
    if (busyId === plan.id) return "Opening…";
    if (plan.contactSalesOnly) return "Talk to Sales Team";
    if (!canManage) return "Admin required";
    const relation = getPlanRelation({ plan, currentPlan, targetCycle: cycle, currentCycle });
    if (live && plan.id === currentPlan?.id && cycle === currentCycle) return "You're on this plan";
    if (live && plan.id === currentPlan?.id) return cycle === "ANNUAL" ? "Switch to yearly billing" : "Switch to monthly billing";
    if (live) return relation === "UPGRADE" ? "Upgrade to this plan" : "Switch to this plan";
    return trialAvailable ? "Start Free 30 Day Trial" : "Continue to checkout";
  };

  const loading = plansLoading || entitlementsLoading;
  const billingBusy = busyId === "cancel" || busyId === "portal";
  const showCurrent = Boolean(entitlements?.entitled && entitlements.billingRequired);

  const openPortal = async () => {
    setBusyId("portal");
    try {
      const portal = await openBillingPortal();
      if (portal.portalUrl) window.location.href = portal.portalUrl;
    } catch (err) {
      setError(billingUserMessage(err, "Could not open the billing portal."));
    } finally {
      setBusyId(null);
    }
  };

  const cancelPlan = async () => {
    if (!window.confirm("Cancel this plan at the end of the current billing period?")) return;
    setBusyId("cancel");
    try {
      const result = await cancelBusinessSubscription();
      await refresh();
      setNotice(result.message);
    } catch (err) {
      setError(billingUserMessage(err, "Could not cancel this plan."));
    } finally {
      setBusyId(null);
    }
  };

  const resumePlan = async () => {
    setBusyId("cancel");
    try {
      const result = await resumeBusinessSubscription();
      await refresh();
      setNotice(result.message);
    } catch (err) {
      setError(billingUserMessage(err, "Could not resume this plan."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <PortalPageShell className="!space-y-3 sm:!space-y-3">
      <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
              {currentPlan ? "Your plan" : isMulti ? "Choose your plan" : "Compare plans"}
            </h1>
            <p className="mt-1.5 font-saveful text-xs text-gray-500">
              {currentPlan
                ? "Review your subscription or move to a different plan"
                : isMulti
                  ? MULTI_SITE_INTRO
                  : "Choose the plan that's right for you"}
            </p>
          </div>
          <BillingCycleToggle cycle={cycle} onChange={setCycle} />
        </header>

        {showCurrent && entitlements ? (
          <CurrentPlanBar
            entitlements={entitlements}
            locationCount={locationCount}
            canManage={canManage}
            busy={billingBusy}
            onPortal={() => void openPortal()}
            onCancel={() => void cancelPlan()}
            onResume={() => void resumePlan()}
          />
        ) : null}

        {entitlements?.pendingPlanDisplayName ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E0CDEF] bg-[#F6EEFC] px-4 py-2 sm:px-5">
            <p className="font-saveful text-xs text-[#5B3A7A]">
              Scheduled: {entitlements.pendingPlanDisplayName} ({billingCycleLabel(entitlements.pendingBillingCycle)})
              {entitlements.pendingChangeEffectiveAt
                ? ` on ${formatBillingDate(entitlements.pendingChangeEffectiveAt)}`
                : ""}
            </p>
            {canManage ? (
              <button
                type="button"
                disabled={busyId === "pending"}
                className="font-saveful-semibold text-xs text-[#5B3A7A] disabled:opacity-50"
                onClick={async () => {
                  if (!window.confirm("Keep your current plan and cancel the scheduled change?")) return;
                  setBusyId("pending");
                  try {
                    const result = await cancelPendingPlanChange();
                    await refresh();
                    setNotice(result.message);
                  } catch (err) {
                    setError(billingUserMessage(err, "Could not cancel the scheduled change."));
                  } finally {
                    setBusyId(null);
                  }
                }}
              >
                {busyId === "pending" ? "Cancelling…" : "Keep current plan"}
              </button>
            ) : null}
          </div>
        ) : null}

        <div className="p-4 sm:p-5">
          {isMulti ? (
            <p className="mb-4 font-saveful text-xs text-gray-500">{MULTI_SITE_SUCCESS_BANNER}</p>
          ) : (
            <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-b border-gray-100 pb-3">
              <span className="font-saveful-semibold text-[11px] uppercase tracking-wide text-gray-400">Included</span>
              {SINGLE_SITE_CORE_FEATURES.map((feature) => {
                const Icon = CORE_ICONS[feature.key];
                return (
                  <span key={feature.key} className="inline-flex items-center gap-1.5 font-saveful text-xs text-gray-600">
                    <Icon className="h-3.5 w-3.5 text-saveful-green" />
                    {feature.label}
                  </span>
                );
              })}
            </div>
          )}

          {error ? <p className="mb-3 font-saveful text-sm text-amber-700">{error}</p> : null}
          {notice ? <p className="mb-3 font-saveful text-sm text-saveful-green">{notice}</p> : null}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#E8E2D6] border-t-saveful-green" />
            </div>
          ) : null}

          {!loading && visible.length === 0 ? (
            <p className="py-8 text-center font-saveful text-sm text-gray-500">
              No plans are available for your organisation right now.
            </p>
          ) : null}

          <div className={`grid gap-4 ${visible.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {visible.map((plan) => {
            const relation = getPlanRelation({ plan, currentPlan, targetCycle: cycle, currentCycle });
            const isCurrent = plan.id === currentPlan?.id && cycle === currentCycle;
            const selected = selectedId === plan.id;
            const price = cycle === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
            const suffix = plan.contactSalesOnly
              ? ""
              : cycle === "ANNUAL"
                ? plan.isPerSite
                  ? "/year / site"
                  : "/year"
                : plan.isPerSite
                  ? "/month / site"
                  : "/month";
            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                  selected || isCurrent ? "border-saveful-green/35" : "border-black/[0.06]"
                }`}
              >
                <button type="button" className="flex-1 text-left" onClick={() => setSelectedId(plan.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-saveful-bold text-base text-gray-900">{plan.displayName}</h3>
                      {!isCurrent && relation !== "NEW" ? (
                        <p className="mt-1 font-saveful text-xs text-saveful-green">
                          {relation === "UPGRADE" ? "Upgrade — applies today" : "Applies at next renewal"}
                        </p>
                      ) : null}
                    </div>
                    {isCurrent ? (
                      <StatusBadge tone="green">Current</StatusBadge>
                    ) : plan.isMostPopular ? (
                      <StatusBadge tone="green">Popular</StatusBadge>
                    ) : null}
                  </div>
                  <p className="mt-3 font-saveful-bold text-3xl leading-none text-gray-900">
                    {plan.contactSalesOnly ? "Custom" : formatPlanPrice(price, plan.currency)}
                    {suffix ? <span className="ml-1.5 font-saveful text-sm font-normal text-gray-400">{suffix}</span> : null}
                  </p>
                  {plan.description ? (
                    <p className="mt-3 font-saveful text-sm leading-relaxed text-gray-500">{plan.description}</p>
                  ) : null}
                  {plan.inheritsFrom ? (
                    <p className="mt-3 font-saveful-semibold text-xs text-saveful-green">
                      Everything in {plan.inheritsFrom.replace(/\s*plan$/i, "")}, plus
                    </p>
                  ) : null}
                  <ul className="mt-4 space-y-2">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 font-saveful text-sm text-gray-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-saveful-green" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </button>
                <Button
                  type="button"
                  variant={plan.contactSalesOnly || isCurrent ? "secondary" : "primary"}
                  disabled={busyId === plan.id || (isCurrent && !plan.contactSalesOnly)}
                  onClick={() => void start(plan)}
                  className="mt-5 w-full"
                >
                  {ctaLabel(plan)}
                </Button>
              </article>
            );
          })}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {TRUST_POINTS.map((point) => (
              <span
                key={point.key}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F8F3] px-2.5 py-1 font-saveful-semibold text-[11px] text-saveful-green"
              >
                <Check className="h-3 w-3" />
                {point.label}
              </span>
            ))}
          </div>

          {!isMulti && visible.length >= 2 ? (
            <div
              ref={compareRef}
              className="mt-4 scroll-mt-20 overflow-hidden rounded-2xl border border-saveful-green/25 bg-white"
            >
              <button
                type="button"
                onClick={() => setCompareOpen((value) => !value)}
                className="flex w-full items-start justify-between gap-3 bg-[#F0F8F3] px-3 py-3 text-left sm:items-center sm:px-4 sm:py-3.5"
              >
                <span className="min-w-0">
                  <span className="block font-saveful-bold text-sm text-gray-900">Compare plans</span>
                  <span className="mt-0.5 block font-saveful text-xs leading-relaxed text-gray-600">
                    See what&apos;s included in Single Site and Single Site +
                  </span>
                </span>
                <ChevronDown
                  className={`mt-0.5 h-5 w-5 shrink-0 text-saveful-green transition sm:mt-0 ${compareOpen ? "rotate-180" : ""}`}
                />
              </button>

              {compareOpen ? (
                <div className="border-t border-saveful-green/15 p-3 sm:p-4">
                  <p className="font-saveful-semibold text-sm text-saveful-green">{SINGLE_SITE_UPGRADE_TITLE}</p>
                  <p className="mt-1 font-saveful text-xs leading-relaxed text-gray-600">{SINGLE_SITE_UPGRADE_BODY}</p>

                  <div className="mt-3 overflow-hidden rounded-xl border border-saveful-green/15">
                    <div className="grid grid-cols-[minmax(0,1fr)_4.75rem_5.25rem] sm:grid-cols-[minmax(0,1fr)_7rem_8rem]">
                      <div className="bg-[#F7F6F2] px-2.5 py-2.5 font-saveful-semibold text-[10px] uppercase tracking-[0.12em] text-gray-500 sm:px-3 sm:text-[11px]">
                        Feature
                      </div>
                      <div className="bg-[#F7F6F2] px-1 py-2.5 text-center font-saveful-bold text-[11px] leading-tight text-gray-700 sm:text-xs">
                        Single Site
                      </div>
                      <div className="bg-[#E8F6EC] px-1 py-2.5 text-center font-saveful-bold text-[11px] leading-tight text-saveful-green sm:text-xs">
                        Single Site +
                      </div>
                      {SINGLE_SITE_COMPARE_SECTIONS.flatMap((section) => [
                        <div
                          key={section.title}
                          className="col-span-3 border-t border-gray-100 bg-white px-2.5 py-2 font-saveful-semibold text-[10px] uppercase tracking-[0.12em] text-gray-400 sm:px-3 sm:text-[11px]"
                        >
                          {section.title}
                        </div>,
                        ...section.rows.map((row) => (
                          <div key={`${section.title}-${row.label}`} className="contents">
                            <div className="border-t border-gray-100 px-2.5 py-2 font-saveful text-xs leading-snug text-gray-700 sm:px-3 sm:py-2.5 sm:text-sm">
                              {row.label}
                            </div>
                            <div className="flex items-center justify-center border-t border-gray-100 px-1 py-2 sm:py-2.5">
                              {compareCell(row.single)}
                            </div>
                            <div className="flex items-center justify-center border-t border-gray-100 bg-[#E8F6EC] px-1 py-2 sm:py-2.5">
                              {compareCell(row.plus)}
                            </div>
                          </div>
                        )),
                      ])}
                    </div>
                  </div>

                  <ul className="mt-3 space-y-2 rounded-xl bg-[#F0F8F3] p-3">
                    {SINGLE_SITE_COMPARE_UPGRADE_POINTS.map((point) => (
                      <li key={point} className="flex items-start gap-2 font-saveful text-xs text-gray-800 sm:text-sm">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-saveful-green text-white">
                          <Check className="h-2.5 w-2.5" />
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      {salesOpen ? <EnterpriseConsultModal onClose={() => setSalesOpen(false)} /> : null}
    </PortalPageShell>
  );
}

function compareCell(value: boolean | string) {
  if (value === true) {
    return <Check className="mx-auto h-4 w-4 text-saveful-green" />;
  }
  if (value === false) {
    return <span className="font-saveful text-gray-300">—</span>;
  }
  return <span className="font-saveful-semibold text-sm text-saveful-green">{value}</span>;
}

function BillingCycleToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
}) {
  return (
    <div className="inline-flex h-10 shrink-0 rounded-xl border border-saveful-green/20 bg-[#E8F6EC] p-1">
      <button
        type="button"
        onClick={() => onChange("MONTHLY")}
        className={`rounded-lg px-3.5 font-saveful-semibold text-sm ${
          cycle === "MONTHLY" ? "bg-saveful-green text-white shadow-sm" : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("ANNUAL")}
        className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 font-saveful-semibold text-sm ${
          cycle === "ANNUAL" ? "bg-saveful-green text-white shadow-sm" : "text-gray-800 hover:text-gray-900"
        }`}
      >
        Annual
        <span
          className={`rounded-md px-1.5 py-0.5 text-[10px] font-saveful-semibold uppercase tracking-wide ${
            cycle === "ANNUAL" ? "bg-white/20 text-white" : "bg-saveful-green text-white"
          }`}
        >
          2 months free
        </span>
      </button>
    </div>
  );
}

function CurrentPlanBar({
  entitlements,
  locationCount,
  canManage,
  busy,
  onPortal,
  onCancel,
  onResume,
}: {
  entitlements: Entitlements;
  locationCount: number | null;
  canManage: boolean;
  busy: boolean;
  onPortal: () => void;
  onCancel: () => void;
  onResume: () => void;
}) {
  const status = String(entitlements.status ?? "").toUpperCase();
  const pill =
    status === "TRIALING"
      ? { label: "Free trial", detail: entitlements.trialEndsAt ? `Trial ends ${formatBillingDate(entitlements.trialEndsAt)}` : null }
      : status === "PAST_DUE"
        ? { label: "Payment due", detail: "Update your card to keep your plan active." }
        : { label: statusLabel(entitlements.status), detail: null };
  const periodEnd = formatBillingDate(entitlements.currentPeriodEnd);
  const locations =
    locationCount == null ? null : `${locationCount} ${locationCount === 1 ? "location" : "locations"}`;
  const meta = [
    pill.label,
    pill.detail,
    entitlements.billingCycle ? `Billed ${billingCycleLabel(entitlements.billingCycle)}` : null,
    locations,
    entitlements.cancelAtPeriodEnd
      ? periodEnd
        ? `Access ends ${periodEnd}`
        : "Cancels at the end of this period"
      : periodEnd
        ? `Renews ${periodEnd}`
        : null,
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-2.5 border-b border-gray-100 bg-[#F7F6F2]/70 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <p className="min-w-0 font-saveful text-xs text-gray-600">
        <span className="font-saveful-semibold text-gray-900">
          {entitlements.planDisplayName || entitlements.planName || "Your plan"}
        </span>
        {meta.map((item) => (
          <span key={String(item)}>
            <span className="text-gray-400"> · </span>
            {item}
          </span>
        ))}
      </p>
      {canManage ? (
        <div className="flex shrink-0 items-center gap-2">
          <Button type="button" size="sm" disabled={busy} onClick={onPortal}>
            <CreditCard className="h-3.5 w-3.5" />
            {busy ? "Opening…" : "Manage billing"}
          </Button>
          {entitlements.cancelAtPeriodEnd ? (
            <Button type="button" size="sm" variant="secondary" disabled={busy} onClick={onResume}>
              Resume
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              variant="secondary"
              disabled={busy}
              onClick={onCancel}
              className="border-red-200 text-red-700 hover:bg-red-50"
            >
              Cancel
            </Button>
          )}
        </div>
      ) : (
        <p className="font-saveful text-[11px] text-gray-400">Only Super Admin can change the plan</p>
      )}
    </div>
  );
}
