"use client";

import { Suspense, useEffect, useState } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Building2, Shield, Store } from "lucide-react";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { AuthLoginForm } from "@/components/auth/AuthLoginForm";
import { LoginBackdrop } from "@/components/auth/LoginBackdrop";
import { homePath, login, loginAdmin, useSession } from "@/lib/auth";
import { loginBusiness, useBusinessSession } from "@/lib/businessAuth";
import type { PortalKind } from "@/types/auth";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginScreen />
    </Suspense>
  );
}

function LoginScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [portal, setPortal] = useState<PortalKind | null>(() => {
    const value = searchParams.get("portal");
    return value === "admin" || value === "enterprise" || value === "business" ? value : null;
  });

  const session = useSession();
  const business = useBusinessSession();

  useEffect(() => {
    if (portal === "business" && business) {
      router.replace("/business/home");
      return;
    }
    if (portal === "enterprise" && session?.portal === "enterprise") {
      router.replace(homePath(session));
      return;
    }
    if (portal === "admin" && session?.portal === "admin") {
      router.replace(homePath(session));
    }
  }, [business, portal, router, session]);

  const selectPortal = (next: PortalKind | null) => {
    setPortal(next);
    router.replace(next ? `/login?portal=${next}` : "/login", { scroll: false });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FAF7F0] px-4 py-10">
      <LoginBackdrop />
      <div className="relative z-10 w-full max-w-md">
        {portal === "enterprise" ? (
          <AuthLoginForm
            config={{
              title: "Welcome back",
              subtitle: "Sign in to manage your organisation, sites and impact.",
              emailPlaceholder: "you@yourbusiness.com",
              badge: "Enterprise",
              initialEmail: searchParams.get("email") ?? "",
              initialInfo: searchParams.get("activated")
                ? "Your account is ready. Sign in with the password you created."
                : searchParams.get("already")
                  ? "This account is already active. Sign in to continue."
                  : "",
              onBack: () => selectPortal(null),
              onSubmit: async (credentials) => {
                await login(credentials);
                router.push("/dashboard");
              },
            }}
          />
        ) : null}

        {portal === "business" ? (
          <AuthLoginForm
            config={{
              title: "Welcome back",
              subtitle: "Sign in to manage your organisation, sites and impact.",
              emailPlaceholder: "you@yourbusiness.com",
              badge: "Business",
              registerPrompt: "Don't have an account?",
              registerActionLabel: "Register now",
              onRegister: () => router.push("/business/register"),
              onBack: () => selectPortal(null),
              onSubmit: async (credentials) => {
                await loginBusiness(credentials.email, credentials.password);
                router.replace("/business/home");
              },
            }}
          />
        ) : null}

        {portal === "admin" ? (
          <AdminLoginForm
            onBack={() => selectPortal(null)}
            onSubmit={async (credentials) => {
              await loginAdmin(credentials);
              router.push("/admin/dashboard");
            }}
          />
        ) : null}

        {!portal ? <PortalPicker onSelect={selectPortal} /> : null}
      </div>
    </div>
  );
}

function PortalPicker({ onSelect }: { onSelect: (portal: PortalKind) => void }) {
  return (
    <div className="relative mx-auto w-full overflow-hidden rounded-3xl bg-white p-8 shadow-2xl md:p-10">
      <div className="mb-8 flex justify-center">
        <div className="relative h-16 w-40">
          <Image src="/logo.png" alt="Saveful" fill sizes="160px" className="object-contain" priority />
        </div>
      </div>
      <div className="mb-8 text-center">
        <h2 className="mb-2 text-2xl font-bold text-[#1a1a1a] md:text-3xl">Sign in</h2>
        <p className="text-sm text-[#6B6B6B]">Choose which portal you want to open.</p>
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => onSelect("enterprise")}
          className="flex w-full items-start gap-3 rounded-2xl border border-black/[0.06] bg-[#F7F6F2] px-4 py-4 text-left transition hover:border-saveful-green/30 hover:bg-white"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 text-saveful-green">
            <Building2 className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-saveful-semibold text-sm text-gray-900">Enterprise</span>
            <span className="mt-0.5 block font-saveful text-xs text-gray-500">
              For organisations managing sites, listings and impact.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("business")}
          className="flex w-full items-start gap-3 rounded-2xl border border-black/[0.06] bg-[#F7F6F2] px-4 py-4 text-left transition hover:border-saveful-green/30 hover:bg-white"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 text-saveful-green">
            <Store className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-saveful-semibold text-sm text-gray-900">Business</span>
            <span className="mt-0.5 block font-saveful text-xs text-gray-500">
              For restaurants, farms and surplus providers.
            </span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => onSelect("admin")}
          className="flex w-full items-start gap-3 rounded-2xl border border-black/[0.06] bg-[#F7F6F2] px-4 py-4 text-left transition hover:border-saveful-green/30 hover:bg-white"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 text-saveful-green">
            <Shield className="h-5 w-5" />
          </span>
          <span>
            <span className="block font-saveful-semibold text-sm text-gray-900">Admin</span>
            <span className="mt-0.5 block font-saveful text-xs text-gray-500">
              For Saveful operators managing the platform.
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
