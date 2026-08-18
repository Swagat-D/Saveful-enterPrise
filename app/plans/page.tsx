"use client";

import { AppPage } from "@/components/layout/AppPage";

export default function PlansPage() {
  return (
    <AppPage
      eyebrow="Billing"
      title="Enterprise plan"
      description="Multi-site restaurant groups use Enterprise. We’ll connect billing and the consult form to the business API next."
    >
      <section className="max-w-xl rounded-3xl border border-white bg-white p-6 shadow-sm">
        <p className="font-saveful-semibold text-sm text-saveful-green">Current</p>
        <h2 className="mt-1 font-saveful-bold text-2xl text-gray-900">Enterprise</h2>
        <p className="mt-2 font-saveful text-sm text-gray-600">
          Unlimited sites, organisation listings, impact reports, and manager access across every kitchen.
        </p>
        <button
          type="button"
          className="mt-5 rounded-xl bg-saveful-green px-4 py-2.5 font-saveful-semibold text-white"
        >
          Request a consult
        </button>
      </section>
    </AppPage>
  );
}
