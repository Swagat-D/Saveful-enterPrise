"use client";

import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { ListingWizard } from "@/components/listings/ListingWizard";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import type { ListingKind } from "@/lib/listingForm";

const kinds: {
  id: ListingKind;
  title: string;
  summary: string;
  description: string;
  icon: string;
  accent: "green" | "orange";
}[] = [
  {
    id: "people",
    title: "Surplus food for people",
    summary: "Suitable for charity donation & community redistribution",
    description:
      "Edible food that is safe for human consumption and within a suitable use-by date",
    icon: "/listing/veggie_basket.png",
    accent: "green",
  },
  {
    id: "farm",
    title: "Surplus not fit for human consumption",
    summary: "Suitable for livestock feed, bio energy or agricultural re-use",
    description:
      "Food past its use-by date, food scraps or surplus suitable for livestock feed or agricultural re-use",
    icon: "/listing/farmhouse.png",
    accent: "orange",
  },
];

function CreateListingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const type = searchParams.get("type");

  if (type === "people" || type === "farm") {
    return <ListingWizard kind={type} />;
  }

  return (
    <AppPage
      eyebrow="Listings"
      title="Create listing"
      description="Firstly tell us what type of surplus food you have, so we can notify the right recipients."
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {kinds.map((kind) => (
          <button
            key={kind.id}
            type="button"
            onClick={() => router.push(`/listings/new?type=${kind.id}`)}
            className={`rounded-2xl border bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
              kind.accent === "green"
                ? "border-saveful-green/30"
                : "border-saveful-orange/30"
            }`}
          >
            <div
              className={`inline-flex rounded-2xl px-3 py-2 ${
                kind.accent === "green" ? "bg-[#EEF0E6]" : "bg-[#F6EFE5]"
              }`}
            >
              <Image src={kind.icon} alt="" width={56} height={56} className="h-14 w-14 object-contain" />
            </div>
            <h2
              className={`mt-4 font-saveful-bold text-lg uppercase leading-snug ${
                kind.accent === "green" ? "text-saveful-green" : "text-saveful-orange"
              }`}
            >
              {kind.title}
            </h2>
            <p className="mt-2 font-saveful-semibold text-sm text-gray-800">{kind.summary}</p>
            <p className="mt-2 font-saveful text-sm leading-relaxed text-gray-500">
              {kind.description}
            </p>
            <span
              className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 font-saveful-semibold text-sm text-white ${
                kind.accent === "green" ? "bg-saveful-green" : "bg-saveful-orange"
              }`}
            >
              List this surplus
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        ))}
      </div>
    </AppPage>
  );
}

export default function CreateListingPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading listing form…" />}>
      <CreateListingContent />
    </Suspense>
  );
}
