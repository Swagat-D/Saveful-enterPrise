import {
  PRODUCT_MODULES,
  type AvailablePlan,
  type BillingCycle,
  type Entitlements,
  type PlanModule,
  type PlanScope,
  type ProductModule,
} from "@/lib/businessTypes";
import { ApiError } from "@/lib/api";

export const SINGLE_SITE_SCREEN_TITLE = "Your Plan - Single Site";
export const MULTI_SITE_SCREEN_TITLE = "Your Plan - Multi Site";
export const ANNUAL_PILL = "2 months free";
export const COMPLETE_LIST_HEADING = "Everything in both modules, plus:";

export const MODULE_LABEL: Record<PlanModule, string> = {
  MFC: "Make Food Count",
  CONNECT: "Saveful Connect",
  COMPLETE: "Complete Solution",
};

/** Card colours from the plans design: purple MFC, green Connect, orange Complete. */
export const MODULE_THEME: Record<
  PlanModule,
  { color: string; text: string; tint: string; border: string; button: string }
> = {
  MFC: {
    color: "#4B2176",
    text: "text-[#4B2176]",
    tint: "bg-[#4B2176]/[0.07]",
    border: "border-[#4B2176]/20",
    button: "bg-[#4B2176] hover:bg-[#3c1a5e]",
  },
  CONNECT: {
    color: "#3A7E52",
    text: "text-[#3A7E52]",
    tint: "bg-[#3A7E52]/[0.07]",
    border: "border-[#3A7E52]/20",
    button: "bg-[#3A7E52] hover:bg-[#2f6843]",
  },
  COMPLETE: {
    color: "#E4502A",
    text: "text-[#E4502A]",
    tint: "bg-[#FF623A]/[0.07]",
    border: "border-[#FF623A]/25",
    button: "bg-[#FF623A] hover:bg-[#e4502a]",
  },
};

type ModuleCopy = {
  tagline: string;
  description: string;
  closingLine: string;
  features: string[];
  multiFeatures: string[];
};

/** Verbatim from the plans design; used only where the backend omits a field. */
export const MODULE_FALLBACK_COPY: Record<PlanModule, ModuleCopy> = {
  MFC: {
    tagline: "Understand your food. Discover more savings.",
    description:
      "Easily record food loss across your kitchen operations, identify opportunities to improve and track your food savings over time.",
    closingLine: "Turn everyday food insights into smarter decisions and greater savings.",
    features: [
      "Simple food-loss tracking — no special equipment required",
      "Record overproduction, spoilage, preparation and plate scraps",
      "Track food types, quantities and sources",
      "See what happened to your food",
      "Identify trends and opportunities to save",
      "Track improvements over time",
      "Detailed dashboards & downloadable reports",
    ],
    multiFeatures: [
      "Centralised site management",
      "Individual and consolidated reporting",
      "Compare food-loss performance across sites",
      "Identify savings opportunities across locations",
    ],
  },
  CONNECT: {
    tagline: "Make more of your surplus food.",
    description:
      "Connect with local charities and recovery partners, coordinate collections and see the difference your surplus food makes.",
    closingLine: "Make more of your surplus food and see the difference you're making.",
    features: [
      "List and manage surplus food",
      "Connect with charities and recovery partners",
      "Collection notifications and tracking",
      "Digital collection and handover records",
      "Reporting on food redistributed & destinations",
      "Track meals created and CO₂e avoided",
      "Downloadable reports and insights",
    ],
    multiFeatures: [
      "Centralised site management",
      "Individual and consolidated reporting",
      "Consolidated Collections",
      "Collection and recipient visibility across sites",
    ],
  },
  COMPLETE: {
    tagline: "One simple system. More savings. Greater impact.",
    description:
      "Bring food tracking and redistribution together in one connected system. Understand what's happening in your kitchen, redirect surplus food and measure the difference you're making.",
    closingLine: "Know more about your food, save more and make every kilogram count.",
    features: [
      "Record food and create redistribution listings in one connected process",
      "Track food from initial recording through to collection",
      "See what was recorded, redirected and where it went",
      "Combined insights across food savings & redistribution",
      "One platform for your team, with no unnecessary duplication",
      "Discounted pricing when you choose both modules",
    ],
    multiFeatures: [
      "Centralised site management",
      "Individual and consolidated reporting",
      "Consolidated collections across sites",
      "Compare food-loss performance and savings across locations",
    ],
  },
};

export const ENTERPRISE_FALLBACK_FEATURES = [
  "Unlimited locations",
  "Make Food Count and Saveful Connect included",
  "Enterprise analytics & executive dashboards",
  "Custom implementation & onboarding",
  "Dedicated Customer Success Manager",
  "Priority support & SLA",
];

/** "1 site", "Up to 10 sites", "Unlimited users" — shown as icon rows, not ticks. */
const ALLOWANCE_LINE = /^(?:\d+|up to \d+|unlimited)\s+(?:sites?|locations?|users?)$/i;

/** Backend card copy with the design copy filling gaps; site/user lines split from ticks. */
export function planCardCopy(plan: AvailablePlan) {
  const fallback = MODULE_FALLBACK_COPY[plan.module];
  const features = plan.features ?? [];
  let split = 0;
  while (split < features.length && ALLOWANCE_LINE.test(features[split].trim())) split += 1;
  const rest = features.slice(split);
  return {
    tagline: plan.tagline ?? fallback.tagline,
    description: plan.description?.trim() || fallback.description,
    closingLine: plan.closingLine ?? fallback.closingLine,
    allowances: features.slice(0, split).map((label) => ({ label, kind: /user/i.test(label) ? "users" : "sites" })),
    ticks: rest.length
      ? rest
      : plan.scope === "MULTI"
        ? [...fallback.multiFeatures, ...fallback.features]
        : fallback.features,
  };
}

export const MULTI_SITE_INTRO =
  "We've recommended the best plan for your business. Based on your organisation profile, here are the plans that suit your needs.";

export const MULTI_SITE_SUCCESS_BANNER =
  "You're all set! Let's start turning your food operations into measurable savings.";

export const TRUST_POINTS = [
  { key: "trial", label: "30 Day Free Trial" },
  { key: "contract", label: "No lock-in contracts" },
  { key: "cancel", label: "Cancel Anytime" },
] as const;

const CURRENCY_SYMBOLS: Record<string, string> = {
  AUD: "A$",
  INR: "₹",
  USD: "US$",
  NZD: "NZ$",
  GBP: "£",
  EUR: "€",
};

export function currencySymbol(currency?: string | null) {
  const code = (currency || "AUD").toUpperCase();
  return CURRENCY_SYMBOLS[code] ?? `${code} `;
}

export function formatPlanPrice(amount: number | null | undefined, currency = "AUD") {
  if (amount == null || Number.isNaN(Number(amount))) return "—";
  const value = Number(amount);
  const hasCents = Math.abs(value % 1) > 0.001;
  const formatted = value.toLocaleString("en-AU", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  });
  return `${currencySymbol(currency)}${formatted}`;
}

export function formatPlanMonthlyLabel(plan: AvailablePlan) {
  if (plan.contactSalesOnly) return "Custom Pricing";
  const price = formatPlanPrice(plan.priceMonthly, plan.currency);
  return plan.isPerSite ? `${price}/month per site` : `${price}/month`;
}

export function formatPlanAnnualLabel(plan: AvailablePlan) {
  if (plan.contactSalesOnly || plan.priceAnnual == null) return "";
  const price = formatPlanPrice(plan.priceAnnual, plan.currency);
  return plan.isPerSite ? `${price}/year per site` : `${price}/year`;
}

export function formatBillingDate(value?: string | Date | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function billingCycleLabel(cycle?: BillingCycle | null) {
  return cycle === "ANNUAL" ? "yearly" : "monthly";
}

/**
 * Enough of a plan to compare against. The org's current plan may be a legacy
 * one (Single Site +, Multi Site) that is no longer listed for sale.
 */
export type PlanRef = {
  id: number;
  module: PlanModule;
  scope: PlanScope;
  /** null when unknown (a legacy plan that is not in the catalogue). */
  priceMonthly: number | null;
  displayName: string;
};

export function resolveCurrentPlanRef(plans: AvailablePlan[], entitlements: Entitlements | null): PlanRef | null {
  if (!entitlements?.entitled || entitlements.planId == null) return null;
  const listed = plans.find((plan) => plan.id === entitlements.planId);
  if (listed) return listed;
  return {
    id: entitlements.planId,
    module: entitlements.planModule ?? "CONNECT",
    scope: entitlements.planScope ?? ((entitlements.maxSites ?? 1) > 1 ? "MULTI" : "SINGLE"),
    priceMonthly: null,
    displayName: entitlements.planDisplayName ?? entitlements.planName ?? "your current plan",
  };
}

/** SWITCH: Make Food Count ↔ Saveful Connect, or another plan at the same price — at the period end. */
export type PlanRelation = "CURRENT" | "UPGRADE" | "DOWNGRADE" | "SWITCH" | "NEW";

const MODULE_RANK: Record<PlanModule, number> = { MFC: 1, CONNECT: 1, COMPLETE: 2 };

/**
 * Mirrors the backend (billing/plan-change.rules.ts) and the app: within a
 * scope the module decides, otherwise the monthly price, then the cycle. Copy
 * only — what is charged always comes from the preview endpoint.
 */
export function getPlanRelation(params: {
  plan: PlanRef;
  currentPlan: PlanRef | null;
  targetCycle: BillingCycle;
  currentCycle: BillingCycle;
}): PlanRelation {
  const { plan, currentPlan, targetCycle, currentCycle } = params;
  if (!currentPlan) return "NEW";
  if (plan.id === currentPlan.id) {
    if (targetCycle === currentCycle) return "CURRENT";
    return targetCycle === "ANNUAL" ? "UPGRADE" : "DOWNGRADE";
  }
  if (plan.scope === currentPlan.scope && plan.module !== currentPlan.module) {
    const delta = MODULE_RANK[plan.module] - MODULE_RANK[currentPlan.module];
    if (delta > 0) return "UPGRADE";
    if (delta < 0) return "DOWNGRADE";
    return "SWITCH";
  }
  if (currentPlan.priceMonthly == null) return "SWITCH";
  const next = plan.priceMonthly ?? 0;
  const now = currentPlan.priceMonthly;
  if (next > now) return "UPGRADE";
  if (next < now) return "DOWNGRADE";
  if (targetCycle === currentCycle) return "SWITCH";
  return targetCycle === "ANNUAL" ? "UPGRADE" : "DOWNGRADE";
}

/** "Add Saveful Connect" when one module → Complete Solution. */
export function addModuleLabel(plan: PlanRef, currentPlan: PlanRef | null) {
  if (plan.module !== "COMPLETE" || !currentPlan || plan.scope !== currentPlan.scope) return null;
  if (currentPlan.module === "MFC") return `Add ${MODULE_LABEL.CONNECT}`;
  if (currentPlan.module === "CONNECT") return `Add ${MODULE_LABEL.MFC}`;
  return null;
}

/** Card CTA, verbatim from the design ("trial", never "trail"). */
export function planCtaLabel(
  plan: AvailablePlan,
  options: { relation: PlanRelation; currentPlan: PlanRef | null; trialAvailable: boolean; cycle: BillingCycle },
) {
  const { relation, currentPlan, trialAvailable, cycle } = options;
  if (relation === "NEW") {
    return trialAvailable && plan.trialDays > 0
      ? `Start your free ${plan.trialDays} day trial for ${plan.displayName}`
      : `Start subscription for ${plan.displayName}`;
  }
  if (relation === "CURRENT") return "Your current plan";
  if (currentPlan && plan.id === currentPlan.id) {
    return cycle === "ANNUAL" ? "Switch to yearly billing" : "Switch to monthly billing";
  }
  if (relation === "UPGRADE") return addModuleLabel(plan, currentPlan) ?? `Upgrade to ${plan.displayName}`;
  return `Switch to ${plan.displayName}`;
}

/** "A$49" + "/month" (per site where it applies) for one cycle. */
export function planPriceForCycle(plan: AvailablePlan, cycle: BillingCycle) {
  const annual = cycle === "ANNUAL";
  return {
    amount: formatPlanPrice(annual ? plan.priceAnnual : plan.priceMonthly, plan.currency),
    suffix: `${annual ? "/year" : "/month"}${plan.isPerSite ? " per site" : ""}`,
  };
}

/** What a per-site plan comes to, e.g. "3 sites · A$207/month". null for flat plans. */
export function perSiteEstimate(plan: AvailablePlan, cycle: BillingCycle, siteCount: number) {
  if (!plan.isPerSite) return null;
  const unit = cycle === "ANNUAL" ? plan.priceAnnual : plan.priceMonthly;
  if (unit == null) return null;
  const sites = Math.max(1, Math.floor(siteCount) || 0);
  const suffix = cycle === "ANNUAL" ? "/year" : "/month";
  return `${sites} ${sites === 1 ? "site" : "sites"} · ${formatPlanPrice(unit * sites, plan.currency)}${suffix}`;
}

// ─── Modules ─────────────────────────────────────────────────────────────────

/**
 * The org has a working plan without `module` — the upsell case. Not while
 * loading, not for orgs never billed, not for orgs with no plan (they get the
 * existing "needs a trial or plan" message instead).
 */
export function isModuleLocked(entitlements: Entitlements | null, module: ProductModule) {
  if (!entitlements?.billingRequired || !entitlements.entitled) return false;
  return !entitlements.modules.includes(module);
}

/** The one module a single-module org lacks. */
export function missingModule(entitlements: Entitlements | null): ProductModule | null {
  if (!entitlements?.billingRequired) return null;
  const held = PRODUCT_MODULES.filter((module) => entitlements.modules.includes(module));
  if (held.length !== 1) return null;
  return PRODUCT_MODULES.find((module) => !held.includes(module)) ?? null;
}

export function billingErrorCode(err: unknown) {
  return err instanceof ApiError ? err.code : undefined;
}

export function isPlanChangeRequiredError(err: unknown) {
  return billingErrorCode(err) === "PLAN_CHANGE_REQUIRED" || (err instanceof ApiError && err.status === 409 && /change.?plan|already (has|have) a subscription/i.test(err.message));
}

export function isNoActiveSubscriptionError(err: unknown) {
  return billingErrorCode(err) === "NO_ACTIVE_SUBSCRIPTION";
}

export function isAlreadyOnPlanError(err: unknown) {
  return billingErrorCode(err) === "ALREADY_ON_PLAN";
}

/** The plan is sold without a free trial (Make Food Count) — use checkout. */
export function isTrialNotOfferedError(err: unknown) {
  return billingErrorCode(err) === "TRIAL_NOT_OFFERED";
}

/** 402: the plan lacks the module this action belongs to. */
export function isModuleRequiredError(err: unknown) {
  return billingErrorCode(err) === "MODULE_REQUIRED";
}

export function requiredModule(err: unknown): ProductModule | null {
  if (!isModuleRequiredError(err) || !(err instanceof ApiError)) return null;
  const required = err.details?.module;
  return required === "MFC" || required === "CONNECT" ? required : null;
}

export function isTrialAlreadyUsedError(err: unknown) {
  if (!(err instanceof ApiError) || err.status !== 409) return false;
  const message = err.message.toLowerCase();
  return message.includes("free trial") || message.includes("already used") || message.includes("already has a subscription");
}

export function billingUserMessage(err: unknown, fallback = "We could not complete this request. Please try again.") {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : fallback;
  const raw = err.message.trim();
  const lower = raw.toLowerCase();
  if (err.status === 503 || lower.includes("payments are not configured")) {
    return "Payments are temporarily unavailable. Please try again shortly or contact support.";
  }
  if (lower.includes("price configured")) {
    return "This plan is not priced for your region yet. Please contact support or choose another plan.";
  }
  if (lower.includes("quote-based") || lower.includes("enterprise plan is quote")) {
    return "Enterprise is quote-based. Submit an enquiry and our team will contact you.";
  }
  if (err.status === 403 && lower.includes("organisation admin")) {
    return "Only an organisation admin can manage billing.";
  }
  return raw || fallback;
}

export function hasLiveSubscription(entitlements: { entitled?: boolean; status?: string | null } | null) {
  const status = String(entitlements?.status ?? "").toUpperCase();
  return Boolean(entitlements?.entitled && (status === "TRIALING" || status === "ACTIVE" || status === "PAST_DUE"));
}
