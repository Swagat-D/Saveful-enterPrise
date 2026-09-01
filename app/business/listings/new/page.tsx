"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { LISTING_ICONS, ListingIcon } from "@/components/business/ListingIcon";
import { PortalPageShell } from "@/components/ui/Portal";
import { useBusinessSession } from "@/lib/businessAuth";
import { useEntitlements } from "@/lib/businessBilling";

export default function SurplusTypePage() {
  return (
    <BusinessGate>
      <SurplusInner />
    </BusinessGate>
  );
}

function SurplusInner() {
  const user = useBusinessSession();
  const router = useRouter();
  const { entitlements } = useEntitlements();
  const needsPlan = Boolean(
    (user?.role === "restaurant_multi" || entitlements?.billingRequired) && entitlements && !entitlements.entitled,
  );

  const go = (href: string) => {
    if (needsPlan) {
      router.push("/business/plans");
      return;
    }
    router.push(href);
  };

  return (
    <PortalPageShell className="!space-y-4">
      <div className="mx-auto w-full max-w-4xl">
        <p className="font-saveful text-[11px] uppercase tracking-[0.16em] text-saveful-green">Listings</p>
        <h1 className="mt-1 font-saveful-bold text-2xl text-gray-900 sm:text-3xl">Today&apos;s Surplus</h1>
        <p className="mt-2 max-w-2xl font-saveful text-sm text-gray-500">
          Firstly tell us what type of surplus food you have, so we can notify the right recipients
        </p>

        {needsPlan ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-saveful text-sm text-amber-900">
            Extra listings stay locked until this organisation is on a trial or plan.{" "}
            <Link href="/business/plans" className="font-saveful-semibold underline">
              View plans
            </Link>
          </p>
        ) : null}

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <button
            type="button"
            onClick={() => go("/business/listings/new/people")}
            className="rounded-2xl border border-saveful-green bg-[#EEF0E6] p-5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <ListingIcon src={LISTING_ICONS.surplusPeople} alt="" className="mb-3 h-16 w-16" />
            <h2 className="font-saveful-bold text-lg uppercase leading-tight text-saveful-green">
              Surplus food for people
            </h2>
            <p className="mt-2 font-saveful-semibold text-sm text-gray-900">
              Suitable for charity donation & community redistribution
            </p>
            <p className="mt-2 font-saveful text-sm text-gray-600">
              Edible food that is safe for human consumption and within a suitable use-by date
            </p>
            <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-saveful-green px-4 font-saveful-bold text-sm text-white">
              List surplus
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>

          <button
            type="button"
            onClick={() => go("/business/listings/new/farm")}
            className="rounded-2xl border border-orange-400 bg-[#F6EFE5] p-5 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
          >
            <ListingIcon src={LISTING_ICONS.surplusFarm} alt="" className="mb-3 h-16 w-16" />
            <h2 className="font-saveful-bold text-lg uppercase leading-tight text-orange-700">
              Surplus not fit for human consumption
            </h2>
            <p className="mt-2 font-saveful-semibold text-sm text-gray-900">
              Suitable for livestock feed, bio energy or agricultural re-use
            </p>
            <p className="mt-2 font-saveful text-sm text-gray-600">
              Food past its use-by date, food scraps or surplus suitable for livestock feed or agricultural re-use
            </p>
            <span className="mt-4 inline-flex h-10 items-center gap-2 rounded-xl bg-[#5B3A7A] px-4 font-saveful-bold text-sm text-white">
              List surplus
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      </div>
    </PortalPageShell>
  );
}
