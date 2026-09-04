"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth";
import { useBusinessSession } from "@/lib/businessAuth";

export default function HomePage() {
  const router = useRouter();
  const session = useSession();
  const business = useBusinessSession();
  const enterpriseOpen = Boolean(session && session.portal !== "admin");
  const adminOpen = session?.portal === "admin";
  const businessOpen = Boolean(business);

  return (
    <main className="min-h-screen bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-end gap-3">
          <Image
            src="/logo.png"
            alt="Saveful for Business"
            width={220}
            height={56}
            priority
            className="h-12 w-auto object-contain sm:h-14"
          />
        </div>

        <h1 className="mt-10 font-saveful-bold text-[2rem] leading-tight text-saveful-green sm:mt-12 sm:text-4xl lg:text-[2.75rem] lg:leading-[1.15]">
          <span className="whitespace-nowrap">One platform. The right workspace</span>
          <br />
          for you.
        </h1>
        <p className="mt-3 font-saveful text-base text-gray-900 sm:text-lg">
          Choose how you use Saveful for Business to continue.
        </p>

        <div className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6">
          <WorkspaceCard
            title="Enterprise organisation"
            audience="For team members of an Enterprise organisation already set up with Saveful."
            detail="Manage sites, users, recovery and organisation-wide impact."
            action={enterpriseOpen ? "Continue →" : "Enterprise sign in →"}
            onClick={() => router.push(enterpriseOpen ? "/dashboard" : "/login?portal=enterprise")}
          />
          <WorkspaceCard
            title="Have surplus food?"
            audience="For businesses and organisations with surplus food to put to good use."
            detail="List surplus, manage collections and track your impact."
            action={businessOpen ? "Continue →" : "Sign in or get started →"}
            onClick={() => router.push(businessOpen ? "/business/home" : "/login?portal=business")}
          />
        </div>

        <button
          type="button"
          onClick={() => router.push(adminOpen ? "/admin/dashboard" : "/login?portal=admin")}
          className="mt-8 font-saveful-semibold text-sm text-saveful-green underline-offset-4 transition hover:text-[#1f4438] hover:underline sm:text-base"
        >
          {adminOpen ? "Continue to admin →" : "Saveful team member? Admin Sign in →"}
        </button>
      </div>
    </main>
  );
}

function WorkspaceCard({
  title,
  audience,
  detail,
  action,
  onClick,
}: {
  title: string;
  audience: string;
  detail: string;
  action: string;
  onClick: () => void;
}) {
  return (
    <article className="flex min-h-[16rem] flex-col rounded-[1.75rem] bg-[#F4F1EA] p-6 sm:min-h-[18rem] sm:p-8">
      <h2 className="whitespace-nowrap font-saveful-bold text-xl text-saveful-green sm:text-2xl">{title}</h2>
      <p className="mt-3 font-saveful-semibold text-sm leading-relaxed text-saveful-green sm:text-[15px]">
        {audience}
      </p>
      <p className="mt-3 font-saveful text-sm leading-relaxed text-[#6B6358] sm:text-[15px]">{detail}</p>
      <div className="mt-auto pt-8">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-11 items-center rounded-full border border-saveful-green bg-transparent px-5 font-saveful-semibold text-sm text-saveful-green transition hover:bg-saveful-green hover:text-white"
        >
          {action}
        </button>
      </div>
    </article>
  );
}
