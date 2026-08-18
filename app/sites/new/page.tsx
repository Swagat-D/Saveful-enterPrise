"use client";

import Link from "next/link";
import { AppPage } from "@/components/layout/AppPage";

export default function CreateSitePage() {
  return (
    <AppPage
      eyebrow="Locations"
      title="Add location"
      description="Add a branch so another kitchen can list surplus and manage its own team."
    >
      <form className="max-w-xl space-y-4 rounded-3xl border border-white bg-white p-6 shadow-sm">
        <label className="block">
          <span className="mb-1 block font-saveful-semibold text-sm text-gray-700">
            Location name
          </span>
          <input className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm" placeholder="e.g. Surry Hills Kitchen" />
        </label>
        <label className="block">
          <span className="mb-1 block font-saveful-semibold text-sm text-gray-700">Address</span>
          <input className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm" placeholder="Search restaurant address" />
        </label>
        <label className="block">
          <span className="mb-1 block font-saveful-semibold text-sm text-gray-700">Postcode</span>
          <input className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm" placeholder="Auto-filled from the map" />
        </label>
        <div className="flex gap-2 pt-2">
          <button type="button" className="rounded-xl bg-saveful-green px-4 py-2.5 font-saveful-semibold text-white">
            Save location
          </button>
          <Link href="/sites" className="rounded-xl border border-gray-200 px-4 py-2.5 font-saveful-semibold text-gray-700">
            Cancel
          </Link>
        </div>
      </form>
    </AppPage>
  );
}
