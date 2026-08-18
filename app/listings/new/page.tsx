"use client";

import Link from "next/link";
import { AppPage } from "@/components/layout/AppPage";
import { demoSites } from "@/lib/demo";

export default function CreateListingPage() {
  return (
    <AppPage
      eyebrow="Listings"
      title="Create listing"
      description="List surplus from a site. Charities and farmers nearby can claim it for pickup."
    >
      <form className="max-w-2xl space-y-4 rounded-3xl border border-white bg-white p-6 shadow-sm">
        <label className="block">
          <span className="mb-1 block font-saveful-semibold text-sm text-gray-700">Site</span>
          <select className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm">
            {demoSites.map((site) => (
              <option key={site.id}>{site.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-saveful-semibold text-sm text-gray-700">Food title</span>
          <input className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm" placeholder="Evening bread and pastries" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-saveful-semibold text-sm text-gray-700">Quantity (kg)</span>
            <input className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm" placeholder="12" />
          </label>
          <label className="block">
            <span className="mb-1 block font-saveful-semibold text-sm text-gray-700">Audience</span>
            <select className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm">
              <option>People</option>
              <option>Animals</option>
              <option>Both</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block font-saveful-semibold text-sm text-gray-700">Pickup window</span>
          <input className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm" placeholder="Today · 8:00 pm – 9:30 pm" />
        </label>
        <div className="flex gap-2 pt-2">
          <button type="button" className="rounded-xl bg-saveful-green px-4 py-2.5 font-saveful-semibold text-white">
            Publish listing
          </button>
          <Link href="/listings" className="rounded-xl border border-gray-200 px-4 py-2.5 font-saveful-semibold text-gray-700">
            Cancel
          </Link>
        </div>
      </form>
    </AppPage>
  );
}
