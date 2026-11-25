"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CreditCard, MapPin, Sparkles, User } from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { EnterpriseConsultModal } from "@/components/business/EnterpriseConsultForm";
import { PortalPageShell } from "@/components/ui/Portal";
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
  ANNUAL_PILL,
  COMPLETE_LIST_HEADING,
  ENTERPRISE_FALLBACK_FEATURES,
  MODULE_LABEL,
  MODULE_THEME,
  MULTI_SITE_INTRO,
  MULTI_SITE_SCREEN_TITLE,
  MULTI_SITE_SUCCESS_BANNER,
  SINGLE_SITE_SCREEN_TITLE,
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
  isTrialNotOfferedError,
  missingModule,
  perSiteEstimate,
  planCardCopy,
  planCtaLabel,
  planPriceForCycle,
  resolveCurrentPlanRef,
  type PlanRelation,
} from "@/lib/businessPlanCopy";
import {
  PRODUCT_MODULES,
  statusLabel,
  type AvailablePlan,
  type BillingCycle,
  type Entitlements,
} from "@/lib/businessTypes";

export default function BusinessPlansPage() {
  return (
    <BusinessGate>
      <PlansInner />
    </BusinessGate>
  );
}

type CardAction = {
  label: string;
  onClick: () => void;
  disabled: boolean;
  /** "Applies today" / "Applies at your next renewal" */
  hint: string | null;
};

/**
 * "Your Plan": Make Food Count and Saveful Connect side by side, Complete
 * Solution full width underneath, and Enterprise last for multi-site orgs.
 * Each card has its own CTA; the trial, checkout and change-plan rules match
 * the app and the backend.
 */
function PlansInner() {
  const user = useBusinessSession();
  const { entitlements, loading: entitlementsLoading, refresh } = useEntitlements();
  const [plans, setPlans] = useState<AvailablePlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState<number | "portal" | "cancel" | "pending" | null>(null);
  const [salesOpen, setSalesOpen] = useState(false);
  const [locationCount, setLocationCount] = useState<number | null>(null);

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

  // Design order: Make Food Count, Saveful Connect, then Complete, then Enterprise.
  const moduleCards = useMemo(
    () =>
      plans
        .filter((plan) => !plan.contactSalesOnly && plan.module !== "COMPLETE")
        .sort((a, b) => (a.module === b.module ? 0 : a.module === "MFC" ? -1 : 1)),
    [plans],
  );
  const completeCards = useMemo(
    () => plans.filter((plan) => !plan.contactSalesOnly && plan.module === "COMPLETE"),
    [plans],
  );
  const enterpriseCards = useMemo(
    () => (isMulti ? plans.filter((plan) => plan.contactSalesOnly) : []),
    [isMulti, plans],
  );

  const live = hasLiveSubscription(entitlements);
  // May be a legacy plan (Single Site +, Multi Site) that is no longer listed.
  const currentPlan = resolveCurrentPlanRef(plans, entitlements);
  const currentCycle = entitlements?.billingCycle ?? "MONTHLY";
  // Stripe bills per real site, at least one.
  const siteCount = Math.max(1, locationCount ?? 0, entitlements?.quantity ?? 0);

  /** Per plan: Make Food Count is never trialled, and each org gets one trial. */
  const trialFor = (plan: AvailablePlan) =>
    !live && plan.trialDays > 0 && (plan.trialAvailable ?? Boolean(entitlements?.freeTrialAvailable));

  const startCheckout = async (plan: AvailablePlan, billingCycle: BillingCycle) => {
    const useTrial = trialFor(plan);
    try {
      const session = useTrial
        ? await startBillingTrial(plan.id, billingCycle)
        : await startBillingCheckout(plan.id, billingCycle);
      if (session.checkoutUrl) {
        window.location.href = session.checkoutUrl;
        return;
      }
      await refresh();
      setNotice(useTrial ? "Your free trial has started." : "Your plan is now active.");
    } catch (err) {
      // Trial already used, or this plan is sold without one: paid checkout.
      if (useTrial && (isTrialAlreadyUsedError(err) || isTrialNotOfferedError(err))) {
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
    // Saveful Connect trial → Complete: the trial carries over, nothing is billed.
    const keepsTrial =
      quote.direction === "UPGRADE" &&
      quote.endsTrialEarly === false &&
      String(entitlements?.status ?? "").toUpperCase() === "TRIALING";
    const message = keepsTrial
      ? `Nothing is charged today. Your free trial continues on ${quote.planDisplayName}${nextBilling ? ` until ${nextBilling}` : ""}, then it renews at ${recurring}.`
      : quote.direction === "UPGRADE"
        ? `You'll be charged ${formatPlanPrice(quote.amountDueToday, quote.currency)} today — the cost of ${quote.planDisplayName} less credit for the unused part of your current plan.\n\n${quote.planDisplayName} then renews at ${recurring}${nextBilling ? ` from ${nextBilling}` : ""}.`
        : `Nothing is charged today. You keep your current plan until ${effective ?? "the end of this billing period"}, then ${quote.changeType === "SWITCH" ? "switch" : "move"} to ${quote.planDisplayName} at ${recurring}.`;
    if (!window.confirm(message)) return;
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

  const actionFor = (plan: AvailablePlan): CardAction => {
    const relation: PlanRelation = live
      ? getPlanRelation({ plan, currentPlan, targetCycle: cycle, currentCycle })
      : "NEW";
    const busy = busyId === plan.id;
    return {
      label: busy ? "Opening…" : planCtaLabel(plan, { relation, currentPlan, trialAvailable: trialFor(plan), cycle }),
      onClick: () => void start(plan),
      disabled: busy || relation === "CURRENT" || !canManage,
      hint:
        relation === "UPGRADE"
          ? "Applies today"
          : relation === "DOWNGRADE" || relation === "SWITCH"
            ? "Applies at your next renewal"
            : null,
    };
  };
  const isCurrent = (plan: AvailablePlan) => currentPlan?.id === plan.id;
  const estimateFor = (plan: AvailablePlan) => (isMulti ? perSiteEstimate(plan, cycle, siteCount) : null);

  const loading = plansLoading || entitlementsLoading;
  const billingBusy = busyId === "cancel" || busyId === "portal";
  const showCurrent = Boolean(entitlements?.entitled && entitlements.billingRequired);
  const anyTrial = plans.some((plan) => !plan.contactSalesOnly && trialFor(plan));

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

  const noPlans = !loading && moduleCards.length + completeCards.length + enterpriseCards.length === 0;

  return (
    <PortalPageShell className="!space-y-3 sm:!space-y-3">
      <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
              {isMulti ? MULTI_SITE_SCREEN_TITLE : SINGLE_SITE_SCREEN_TITLE}
            </h1>
            <p className="mt-1.5 font-saveful text-xs text-gray-500">
              {currentPlan
                ? "Review your plan, add a module or change how you are billed"
                : isMulti
                  ? MULTI_SITE_INTRO
                  : "Choose the plan that's right for your kitchen"}
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

        <div className="space-y-4 p-4 sm:p-5">
          {isMulti ? (
            <p className="flex items-center gap-2 font-saveful text-xs text-gray-500">
              <Sparkles className="h-3.5 w-3.5 text-saveful-green" />
              {MULTI_SITE_SUCCESS_BANNER}
            </p>
          ) : null}

          {!canManage ? (
            <p className="rounded-xl border border-gray-200 bg-[#F7F6F2] px-4 py-3 font-saveful text-sm text-gray-600">
              Only your organisation Super Admin can start or change a plan.
            </p>
          ) : null}

          {error ? <p className="font-saveful text-sm text-amber-700">{error}</p> : null}
          {notice ? <p className="font-saveful text-sm text-saveful-green">{notice}</p> : null}

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-[#E8E2D6] border-t-saveful-green" />
            </div>
          ) : null}

          {noPlans ? (
            <p className="py-8 text-center font-saveful text-sm text-gray-500">
              No plans are available for your organisation right now.
            </p>
          ) : null}

          {!loading && moduleCards.length ? (
            <div className={`grid items-stretch gap-4 ${moduleCards.length > 1 ? "md:grid-cols-2" : ""}`}>
              {moduleCards.map((plan) => (
                <ModulePlanCard
                  key={plan.id}
                  plan={plan}
                  cycle={cycle}
                  action={actionFor(plan)}
                  current={isCurrent(plan)}
                  estimate={estimateFor(plan)}
                />
              ))}
            </div>
          ) : null}

          {!loading
            ? completeCards.map((plan) => (
                <CompletePlanCard
                  key={plan.id}
                  plan={plan}
                  cycle={cycle}
                  action={actionFor(plan)}
                  current={isCurrent(plan)}
                  estimate={estimateFor(plan)}
                />
              ))
            : null}

          {!loading
            ? enterpriseCards.map((plan) => (
                <EnterprisePlanCard
                  key={plan.id}
                  plan={plan}
                  current={isCurrent(plan)}
                  onContactSales={() => setSalesOpen(true)}
                />
              ))
            : null}

          {!loading && !noPlans ? (
            <div className="flex flex-wrap gap-2">
              {TRUST_POINTS.filter((point) => point.key !== "trial" || anyTrial).map((point) => (
                <span
                  key={point.key}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#F0F8F3] px-2.5 py-1 font-saveful-semibold text-[11px] text-saveful-green"
                >
                  <Check className="h-3 w-3" />
                  {point.label}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>

      {salesOpen ? <EnterpriseConsultModal onClose={() => setSalesOpen(false)} /> : null}
    </PortalPageShell>
  );
}

// ─── Cards ───────────────────────────────────────────────────────────────────

function Tick({ label, color }: { label: string; color: string }) {
  return (
    <li className="flex items-start gap-2.5 font-saveful text-sm text-gray-800">
      <span
        className="mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        <Check className="h-3 w-3" strokeWidth={3} />
      </span>
      {label}
    </li>
  );
}

function Allowances({ rows, color }: { rows: { label: string; kind: string }[]; color: string }) {
  if (!rows.length) return null;
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const Icon = row.kind === "users" ? User : MapPin;
        return (
          <li key={row.label} className="flex items-center gap-2.5 font-saveful text-sm text-gray-800">
            <Icon className="h-[18px] w-[18px] shrink-0" style={{ color }} />
            {row.label}
          </li>
        );
      })}
    </ul>
  );
}

function Cta({ action, buttonClass }: { action: CardAction; buttonClass: string }) {
  return (
    <div className="space-y-1">
      <button
        type="button"
        onClick={action.onClick}
        disabled={action.disabled}
        className={`flex min-h-10 w-full items-center justify-center rounded-lg px-4 py-2 text-center font-saveful-semibold text-sm text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonClass}`}
      >
        {action.label}
      </button>
      {action.hint ? <p className="text-center font-saveful text-[11px] text-gray-500">{action.hint}</p> : null}
    </div>
  );
}

function Price({ plan, cycle, color, estimate }: { plan: AvailablePlan; cycle: BillingCycle; color: string; estimate?: string | null }) {
  const price = planPriceForCycle(plan, cycle);
  return (
    <div>
      <p className="font-saveful-bold text-3xl leading-none" style={{ color }}>
        {price.amount}
        <span className="ml-1.5 font-saveful text-sm font-normal text-gray-500">{price.suffix}</span>
      </p>
      {estimate ? <p className="mt-1 font-saveful-semibold text-xs text-gray-500">{estimate}</p> : null}
    </div>
  );
}

function YourPlanPill({ color }: { color: string }) {
  return (
    <span className="rounded-md px-2 py-0.5 font-saveful-bold text-[11px] text-white" style={{ backgroundColor: color }}>
      Your plan
    </span>
  );
}

/** Make Food Count / Saveful Connect card from the design. CTA at the top and bottom. */
function ModulePlanCard({
  plan,
  cycle,
  action,
  current,
  estimate,
}: {
  plan: AvailablePlan;
  cycle: BillingCycle;
  action: CardAction;
  current: boolean;
  estimate: string | null;
}) {
  const theme = MODULE_THEME[plan.module];
  const copy = planCardCopy(plan);
  return (
    <article
      className={`flex flex-col gap-4 rounded-2xl border p-5 ${theme.tint} ${current ? "border-2" : theme.border}`}
      style={current ? { borderColor: theme.color } : undefined}
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <h2 className={`text-center font-saveful-bold text-lg ${theme.text}`}>{plan.displayName}</h2>
        {current ? <YourPlanPill color={theme.color} /> : null}
      </div>
      <p className={`font-saveful-bold text-sm ${theme.text}`}>{copy.tagline}</p>
      <Price plan={plan} cycle={cycle} color={theme.color} estimate={estimate} />
      <p className="font-saveful text-sm leading-relaxed text-gray-500">{copy.description}</p>
      <Cta action={action} buttonClass={theme.button} />
      <Allowances rows={copy.allowances} color={theme.color} />
      <ul className="space-y-2.5">
        {copy.ticks.map((tick) => (
          <Tick key={tick} label={tick} color={theme.color} />
        ))}
      </ul>
      <div className="flex-1" />
      <p className={`font-saveful-bold text-sm ${theme.text}`}>{copy.closingLine}</p>
      <Cta action={action} buttonClass={theme.button} />
    </article>
  );
}

/** Full-width Complete Solution card: pitch and price left, "Everything in both modules, plus:" right. */
function CompletePlanCard({
  plan,
  cycle,
  action,
  current,
  estimate,
}: {
  plan: AvailablePlan;
  cycle: BillingCycle;
  action: CardAction;
  current: boolean;
  estimate: string | null;
}) {
  const theme = MODULE_THEME.COMPLETE;
  const copy = planCardCopy(plan);
  return (
    <article
      className={`rounded-2xl border p-5 ${theme.tint} ${current ? "border-2" : theme.border}`}
      style={current ? { borderColor: theme.color } : undefined}
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {current ? <YourPlanPill color={theme.color} /> : null}
            {plan.badge && !current ? (
              <span className="rounded-md px-2 py-0.5 font-saveful-bold text-[11px] text-white" style={{ backgroundColor: theme.color }}>
                {plan.badge}
              </span>
            ) : null}
          </div>
          <h2 className={`font-saveful-bold text-lg ${theme.text}`}>{plan.displayName}</h2>
          <p className={`font-saveful-bold text-sm ${theme.text}`}>{copy.tagline}</p>
          <Price plan={plan} cycle={cycle} color={theme.color} estimate={estimate} />
          <p className="font-saveful text-sm leading-relaxed text-gray-500">{copy.description}</p>
          <Allowances rows={copy.allowances} color={theme.color} />
        </div>
        <div className="space-y-3">
          <p className={`font-saveful-bold text-sm ${theme.text}`}>{COMPLETE_LIST_HEADING}</p>
          <ul className="space-y-2.5">
            {copy.ticks.map((tick) => (
              <Tick key={tick} label={tick} color={theme.color} />
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <p className={`font-saveful-bold text-sm ${theme.text}`}>{copy.closingLine}</p>
        <div className="lg:min-w-[45%]">
          <Cta action={action} buttonClass={theme.button} />
        </div>
      </div>
    </article>
  );
}

/** Enterprise (10+ locations): quote-based, opens the sales enquiry. */
function EnterprisePlanCard({
  plan,
  current,
  onContactSales,
}: {
  plan: AvailablePlan;
  current: boolean;
  onContactSales: () => void;
}) {
  const features = plan.features.length ? plan.features : ENTERPRISE_FALLBACK_FEATURES;
  return (
    <article className={`rounded-2xl border bg-white p-5 ${current ? "border-2 border-gray-900" : "border-black/[0.08]"}`}>
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-2">
          {current ? <YourPlanPill color="#111827" /> : null}
          <h2 className="font-saveful-bold text-lg text-gray-900">{plan.displayName}</h2>
          <p className="font-saveful-bold text-sm text-gray-500">{plan.tagline ?? "10+ locations"}</p>
          <p className="font-saveful-bold text-2xl text-gray-900">Custom Pricing</p>
          {plan.description ? <p className="font-saveful text-sm leading-relaxed text-gray-500">{plan.description}</p> : null}
        </div>
        <ul className="space-y-2.5">
          {features.map((feature) => (
            <Tick key={feature} label={feature} color="#111827" />
          ))}
        </ul>
      </div>
      {current ? null : (
        <div className="mt-5 flex justify-end">
          <Button type="button" variant="secondary" onClick={onContactSales} className="w-full lg:w-auto">
            Talk to Sales Team
          </Button>
        </div>
      )}
    </article>
  );
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
          {ANNUAL_PILL}
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
  const missing = missingModule(entitlements);
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
      <div className="min-w-0 space-y-1.5">
        <p className="font-saveful text-xs text-gray-600">
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
        {entitlements.modules.length ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {PRODUCT_MODULES.filter((module) => entitlements.modules.includes(module)).map((module) => (
              <span
                key={module}
                className={`rounded-full border px-2 py-0.5 font-saveful-semibold text-[11px] ${MODULE_THEME[module].tint} ${MODULE_THEME[module].border} ${MODULE_THEME[module].text}`}
              >
                {MODULE_LABEL[module]}
              </span>
            ))}
            {missing ? (
              <span className="font-saveful text-[11px] text-gray-500">
                {MODULE_LABEL[missing]} isn&apos;t in your plan — Complete Solution includes both.
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      {canManage && entitlements.hasBillingAccount === false ? (
        // Set up by Saveful directly (no Stripe customer): no portal, and no
        // self-serve cancel — that would end the plan immediately.
        <p className="max-w-xs font-saveful text-[11px] text-gray-500 sm:text-right">
          This plan is managed by Saveful. Contact Saveful support to change or cancel it.
        </p>
      ) : canManage ? (
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
