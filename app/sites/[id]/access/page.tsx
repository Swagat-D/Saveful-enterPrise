"use client";

import { use } from "react";
import Link from "next/link";
import { AppPage } from "@/components/layout/AppPage";
import { demoSites } from "@/lib/demo";

export default function ManageAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const site = demoSites.find((item) => item.id === id);

  return (
    <AppPage
      eyebrow="Site access"
      title={site ? `Manage access · ${site.name}` : "Manage access"}
      description="Invite a site manager or remove access for this location only."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-white bg-white p-6 shadow-sm">
          <h2 className="font-saveful-bold text-lg text-gray-900">Current manager</h2>
          <p className="mt-2 font-saveful text-sm text-gray-600">
            {site?.hasManager ? site.managerName : "No manager assigned"}
          </p>
          <p className="mt-1 font-saveful text-sm text-gray-500">{site?.email}</p>
        </section>
        <section className="rounded-3xl border border-white bg-white p-6 shadow-sm">
          <h2 className="font-saveful-bold text-lg text-gray-900">Invite manager</h2>
          <div className="mt-4 space-y-3">
            <input className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm" placeholder="Manager name" />
            <input className="w-full rounded-xl border border-gray-200 bg-[#F5F1E8] px-4 py-3 font-saveful text-sm" placeholder="Email" />
            <button type="button" className="rounded-xl bg-saveful-green px-4 py-2.5 font-saveful-semibold text-white">
              Send invite
            </button>
          </div>
        </section>
      </div>
      <Link href="/sites" className="inline-block font-saveful-semibold text-sm text-saveful-green hover:underline">
        Back to sites
      </Link>
    </AppPage>
  );
}
