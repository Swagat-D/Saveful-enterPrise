"use client";

import Link from "next/link";
import { BUSINESS_ROLES } from "@/lib/businessTypes";

export default function BusinessRegisterPickPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="font-saveful-semibold text-xs uppercase tracking-[0.16em] text-saveful-green">Create organisation</p>
        <h1 className="mt-2 font-saveful-bold text-3xl text-gray-900">What kind of business are you?</h1>
        <p className="mt-2 max-w-xl font-saveful text-sm text-gray-600">
          This creates the organisation on the website. The trial or plan comes next. The app is login only after that.
        </p>
        <p className="mt-3 font-saveful text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login?portal=business" className="font-saveful-semibold text-saveful-green hover:underline">
            Sign in
          </Link>
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(BUSINESS_ROLES) as Array<keyof typeof BUSINESS_ROLES>).map((id) => {
          const item = BUSINESS_ROLES[id];
          return (
            <Link
              key={id}
              href={`/business/register/${id}`}
              className="rounded-2xl border border-black/[0.05] bg-white p-5 transition hover:border-saveful-green/40 hover:shadow-sm"
            >
              <p className="font-saveful-semibold text-xs uppercase tracking-wide text-saveful-green">{item.label}</p>
              <h2 className="mt-2 font-saveful-bold text-lg text-gray-900">{item.title}</h2>
              <p className="mt-2 font-saveful text-sm text-gray-600">{item.description}</p>
              <p className="mt-4 font-saveful-semibold text-sm text-saveful-green">Continue →</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
