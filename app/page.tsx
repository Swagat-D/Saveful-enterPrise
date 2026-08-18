"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";

export default function HomePage() {
  const router = useRouter();
  const session = useSession();

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-linear-to-br from-saveful-cream/40 via-white to-saveful-cream/60 px-4 py-8 md:px-8 md:py-12">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-16 h-72 w-72 rounded-full bg-saveful-orange/15 blur-3xl" />
        <div className="absolute -right-16 top-24 h-80 w-80 rounded-full bg-saveful-green/15 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-saveful-purple/10 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-5xl">
        <section className="overflow-hidden rounded-3xl border border-white/50 bg-white/85 p-8 shadow-xl backdrop-blur-md md:p-12">
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-saveful-green/10 bg-white p-2 shadow-sm">
              <Image
                src="/logo@3x.png"
                alt="Saveful logo"
                width={140}
                height={52}
                priority
                className="h-auto w-auto object-contain"
              />
            </div>
            <span className="rounded-full bg-saveful-green/10 px-3 py-1 font-saveful-semibold text-xs text-saveful-green">
              Enterprise
            </span>
          </div>

          <h1 className="max-w-2xl font-saveful-bold text-4xl leading-tight text-saveful-green md:text-5xl">
            One workspace for every restaurant site
          </h1>
          <p className="mt-4 max-w-xl font-saveful text-base text-gray-600 md:text-lg">
            Sign in to manage locations, surplus listings, collections, and impact
            across your multi-site business — the same restaurant multi-site flow
            as Saveful for Business, built for the web.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {[
              { title: "Sites", copy: "HQ plus branches, managers, and access." },
              { title: "Listings", copy: "Create surplus, track claims and pickups." },
              { title: "Insights", copy: "Food saved, meals, CO₂, and collections." },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-saveful-green/10 bg-saveful-cream/50 p-4"
              >
                <p className="font-saveful-semibold text-sm text-saveful-green">{item.title}</p>
                <p className="mt-1 font-saveful text-sm text-gray-600">{item.copy}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => router.push(session ? "/sites" : "/login")}
            className="mt-8 inline-flex items-center rounded-xl bg-saveful-green px-5 py-3 font-saveful-semibold text-white transition hover:bg-green-700"
          >
            {session ? "Open sites dashboard" : "Sign in to Enterprise"}
          </button>
        </section>
      </div>
    </main>
  );
}
