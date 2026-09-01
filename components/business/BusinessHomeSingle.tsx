"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3 } from "lucide-react";
import { LISTING_ICONS, ListingIcon } from "@/components/business/ListingIcon";
import { PortalPageShell } from "@/components/ui/Portal";
import { useBusinessSession } from "@/lib/businessAuth";
import { useEntitlements } from "@/lib/businessBilling";
import {
  EMPTY_IMPACT_STATS,
  fetchBusinessLifetimeImpact,
  formatImpactNumber,
  type ImpactDisplayStats,
} from "@/lib/businessImpact";
import { IMPACT } from "@/lib/impact";
import { statusLabel } from "@/lib/businessTypes";
import { cn } from "@/lib/utils";

function greetingForNow() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function BusinessHomeSingle() {
  const user = useBusinessSession();
  const { entitlements } = useEntitlements();
  const [impact, setImpact] = useState<ImpactDisplayStats>(EMPTY_IMPACT_STATS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    void fetchBusinessLifetimeImpact(user)
      .then(setImpact)
      .catch(() => setImpact(EMPTY_IMPACT_STATS))
      .finally(() => setLoading(false));
  }, [user]);

  if (!user) return null;

  const firstName = user.firstName || user.name.split(" ")[0];
  const isFarm = user.role === "farm_business";
  const needsPlan = Boolean(entitlements?.billingRequired && !entitlements.entitled);
  const firstTime =
    impact.redistributedKg === 0 && impact.collectionsCompleted === 0 && impact.co2AvoidedKg === 0;
  const surplusHref = needsPlan ? "/business/plans" : "/business/listings/new";
  const steps = isFarm
    ? ["List items", "Partners notified", "Pickup arranged"]
    : ["List items", "Charities notified", "Pickup arranged"];

  return (
    <PortalPageShell className="!space-y-3 sm:!space-y-3">
      <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
              {firstTime ? `Welcome, ${firstName}` : `${greetingForNow()}, ${firstName}`}
            </h1>
            <p className="mt-1.5 truncate font-saveful text-xs text-gray-500">
              {user.organization}
              {user.address ? (
                <>
                  <span className="text-gray-300"> · </span>
                  {user.address}
                </>
              ) : null}
            </p>
          </div>
          <Link
            href={surplusHref}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
          >
            {needsPlan ? "Activate plan" : "List surplus"}
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        <div className="space-y-3 p-4 sm:p-5">
          {entitlements && needsPlan ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 font-saveful text-xs text-amber-900">
              {statusLabel(entitlements.status)}
              {" — listings stay locked until you start a trial or choose a plan."}
            </p>
          ) : null}

          <Link
            href={surplusHref}
            className="block overflow-hidden rounded-xl border border-gray-200 transition hover:border-saveful-green/30"
          >
            <div className="flex items-center justify-between gap-3 bg-[#F0F8F3] px-3.5 py-2.5">
              <div className="min-w-0">
                <p className="font-saveful-semibold text-[11px] uppercase tracking-[0.14em] text-saveful-green">
                  Today&apos;s surplus
                </p>
                <p className="mt-0.5 font-saveful-bold text-base text-gray-900">
                  {isFarm ? "Got surplus for livestock?" : "Got surplus food?"}
                </p>
              </div>
              <ListingIcon
                src={isFarm ? LISTING_ICONS.boxedOrange : LISTING_ICONS.boxed}
                className="h-10 w-10 shrink-0"
              />
            </div>
            <div className="space-y-3 px-3.5 py-3">
              <p className="font-saveful text-xs text-gray-500">
                {isFarm
                  ? "List what you have — recovery partners get notified to arrange pickup."
                  : "List what you have — local charities get notified to arrange pickup."}
              </p>
              <ol className="flex items-center gap-1.5">
                {steps.map((label, index) => (
                  <li key={label} className="flex min-w-0 flex-1 items-center gap-1.5">
                    <div className="flex min-w-0 flex-col items-center gap-1 text-center">
                      <span
                        className={cn(
                          "flex h-6 w-6 items-center justify-center rounded-full font-saveful-bold text-[11px]",
                          index === 0 ? "bg-saveful-green text-white" : "bg-[#F0F8F3] text-saveful-green",
                        )}
                      >
                        {index + 1}
                      </span>
                      <span className="font-saveful-semibold text-[10px] leading-tight text-gray-500">{label}</span>
                    </div>
                    {index < steps.length - 1 ? <span className="mb-4 h-px flex-1 bg-[#D8E8DE]" /> : null}
                  </li>
                ))}
              </ol>
            </div>
          </Link>

          <section className="overflow-hidden rounded-xl border border-gray-200">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
              <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">
                Your impact so far
              </h2>
              <Link href="/business/insights" className="font-saveful-semibold text-xs text-saveful-green">
                View insights
              </Link>
            </div>
            <div className="grid gap-2 p-2.5 sm:grid-cols-3">
              <ImpactTile
                icon={LISTING_ICONS.meals}
                label="Food saved"
                value={loading ? "—" : `${formatImpactNumber(impact.redistributedKg)} kg`}
              />
              <ImpactTile
                icon={LISTING_ICONS.collections}
                label="Collections"
                value={loading ? "—" : formatImpactNumber(impact.collectionsCompleted, 0)}
              />
              <ImpactTile
                icon={LISTING_ICONS.impact}
                label="CO₂ avoided"
                value={loading ? "—" : `${formatImpactNumber(impact.co2AvoidedKg)} kg`}
              />
            </div>
            {firstTime && !loading ? (
              <p className="border-t border-gray-100 px-3.5 py-2 font-saveful text-xs text-gray-500">
                List your first surplus to start tracking your impact here.
              </p>
            ) : (
              <Link
                href="/business/insights"
                className="flex items-center justify-between border-t border-gray-100 px-3.5 py-2 font-saveful-semibold text-xs text-saveful-green"
              >
                <span className="inline-flex items-center gap-1.5">
                  <BarChart3 className="h-3.5 w-3.5" />
                  View detailed insights
                </span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </section>

          <p className="font-saveful text-[11px] text-gray-400">
            About our calculations · 1 meal = {IMPACT.MEAL_WEIGHT_KG} kg · CO₂ avoided = {IMPACT.CO2_PER_KG} kg
            per kg recovered.
          </p>
        </div>
      </section>
    </PortalPageShell>
  );
}

function ImpactTile({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <Link href="/business/insights" className="rounded-lg bg-[#F7F6F2] px-3 py-2.5 hover:bg-[#F0F8F3]">
      <ListingIcon src={icon} className="h-6 w-6" />
      <p className="mt-1.5 font-saveful-bold text-lg tabular-nums text-gray-900">{value}</p>
      <p className="font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">{label}</p>
    </Link>
  );
}
