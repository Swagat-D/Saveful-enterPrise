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
    <main className="min-h-screen overflow-x-hidden bg-white px-5 py-8 sm:px-8 sm:py-10 lg:px-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="flex items-end gap-3">
          <Image
            src="/logo.png"
            alt="Saveful for Business"
            width={220}
            height={56}
            priority
            className="h-10 w-auto object-contain sm:h-12 lg:h-14"
          />
        </div>

        <h1 className="mt-8 font-saveful-bold text-[1.7rem] leading-tight text-saveful-green sm:mt-10 sm:text-3xl md:text-4xl lg:mt-12 lg:whitespace-nowrap lg:text-[clamp(1.85rem,2.8vw,2.65rem)] lg:leading-[1.15]">
          One platform. The right workspace for you.
        </h1>
        <p className="mt-3 max-w-xl font-saveful text-[15px] text-gray-900 sm:max-w-none sm:text-base lg:text-lg">
          Choose how you use Saveful for Business to continue.
        </p>

        <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 md:grid-cols-2 md:gap-6">
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
    <article className="flex min-h-0 flex-col rounded-[1.75rem] border border-saveful-green bg-[#FBF9F4] p-5 sm:min-h-[16rem] sm:p-6 lg:min-h-[18rem] lg:p-8">
      <h2 className="font-saveful-bold text-xl text-saveful-green sm:whitespace-nowrap sm:text-2xl">{title}</h2>
      <p className="mt-3 font-saveful-semibold text-sm leading-relaxed text-saveful-green sm:text-[15px]">
        {audience}
      </p>
      <p className="mt-3 font-saveful text-sm leading-relaxed text-[#6B6358] sm:text-[15px]">{detail}</p>
      <div className="mt-6 pt-0 sm:mt-auto sm:pt-8">
        <button
          type="button"
          onClick={onClick}
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-saveful-green bg-transparent px-5 font-saveful-semibold text-sm text-saveful-green transition hover:bg-saveful-green hover:text-white sm:w-auto"
        >
          {action}
        </button>
      </div>
    </article>
  );
}
