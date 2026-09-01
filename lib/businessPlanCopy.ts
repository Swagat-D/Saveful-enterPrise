import type { AvailablePlan, BillingCycle } from "@/lib/businessTypes";
import { ApiError } from "@/lib/api";

export const SINGLE_SITE_CORE_FEATURES = [
  { key: "surplus", label: "Surplus Listing" },
  { key: "matching", label: "Charity Matching" },
  { key: "impact", label: "Impact Tracking" },
  { key: "secure", label: "Secure & Trusted" },
] as const;

export const SINGLE_SITE_UPGRADE_TITLE = "Why upgrade to Single Site +";
export const SINGLE_SITE_UPGRADE_BODY =
  "Unlock deeper insights, identify where money is being lost and improve operational performance.";

export const SINGLE_SITE_COMPARE_UPGRADE_POINTS = [
  "Identify where food, time & money are being lost",
  "Identify cost-saving opportunities",
  "Generate management & ESG reports in seconds",
] as const;

export const SINGLE_SITE_COMPARE_SECTIONS = [
  {
    title: "USERS",
    rows: [
      { label: "Users included", single: "Up to 2", plus: "Up to 6" },
    ],
  },
  {
    title: "OPERATIONS & REPORTING",
    rows: [
      { label: "Surplus Listing", single: true, plus: true },
      { label: "Charity matching & pickup coordination", single: true, plus: true },
      { label: "Basic impact tracking", single: true, plus: true },
      { label: "Date specification", single: true, plus: true },
      { label: "Operational insights", single: false, plus: true },
      { label: "Identify cost saving opportunities", single: false, plus: true },
      { label: "Download ESG & management report", single: false, plus: true },
      { label: "Priority support", single: false, plus: true },
    ],
  },
] as const;

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

export type PlanRelation = "CURRENT" | "UPGRADE" | "DOWNGRADE" | "NEW";

export function getPlanRelation(params: {
  plan: AvailablePlan;
  currentPlan: AvailablePlan | null;
  targetCycle: BillingCycle;
  currentCycle: BillingCycle;
}): PlanRelation {
  const { plan, currentPlan, targetCycle, currentCycle } = params;
  if (!currentPlan) return "NEW";
  if (plan.id === currentPlan.id) {
    if (targetCycle === currentCycle) return "CURRENT";
    return targetCycle === "ANNUAL" ? "UPGRADE" : "DOWNGRADE";
  }
  const next = plan.priceMonthly ?? 0;
  const now = currentPlan.priceMonthly ?? 0;
  if (next === now) return targetCycle === "ANNUAL" ? "UPGRADE" : "DOWNGRADE";
  return next > now ? "UPGRADE" : "DOWNGRADE";
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
