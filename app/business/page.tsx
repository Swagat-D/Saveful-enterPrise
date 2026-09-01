"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { StoreBadges } from "@/components/business/StoreBadges";
import { BUSINESS_ROLES } from "@/lib/businessTypes";
import { useBusinessSession } from "@/lib/businessAuth";

export default function BusinessLandingPage() {
  const user = useBusinessSession();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace("/business/home");
  }, [router, user]);

  return (
    <div className="space-y-10">
      <section className="rounded-3xl border border-white/60 bg-white/90 p-6 shadow-sm sm:p-10">
        <p className="font-saveful-semibold text-xs uppercase tracking-[0.16em] text-saveful-green">
          Restaurants & surplus providers
        </p>
        <h1 className="mt-3 max-w-2xl font-saveful-bold text-4xl leading-tight text-saveful-green sm:text-5xl">
          Create your organisation here. Use the app to list surplus.
        </h1>
        <p className="mt-4 max-w-xl font-saveful text-base text-gray-600">
          Paying provider accounts are created and billed on this website. After that, authorised
          people only log in on iOS or Android. Charity and consumer signup stays in the app.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/business/register"
            className="inline-flex h-12 items-center justify-center rounded-xl bg-saveful-green px-6 font-saveful-semibold text-white"
          >
            Register your business
          </Link>
          <Link
            href="/login?portal=business"
            className="inline-flex h-12 items-center justify-center rounded-xl border border-saveful-green/20 bg-white px-6 font-saveful-semibold text-saveful-green"
          >
            Sign in
          </Link>
        </div>
        <div className="mt-8">
          <p className="mb-2 font-saveful text-xs text-gray-500">Get the Saveful app</p>
          <StoreBadges />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {Object.entries(BUSINESS_ROLES).map(([id, item]) => (
          <Link
            key={id}
            href={`/business/register/${id}`}
            className="rounded-2xl border border-black/[0.05] bg-white p-5 transition hover:border-saveful-green/30"
          >
            <p className="font-saveful-semibold text-sm text-saveful-green">{item.label}</p>
            <h2 className="mt-2 font-saveful-bold text-lg text-gray-900">{item.title}</h2>
            <p className="mt-2 font-saveful text-sm text-gray-600">{item.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
