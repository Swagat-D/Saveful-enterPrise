"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminLoginForm } from "@/components/auth/AdminLoginForm";
import { AuthLoginForm } from "@/components/auth/AuthLoginForm";
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
    const value = searchParams.get("portal");
    const next = value === "admin" || value === "enterprise" || value === "business" ? value : null;
    setPortal(next);
    if (!next) router.replace("/");
  }, [router, searchParams]);

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

  if (!portal) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#FAF7F0] px-4 py-10">
      <div className="w-full max-w-[420px]">
        {portal === "enterprise" ? (
          <AuthLoginForm
            config={{
              title: "Welcome back",
              subtitle: "Sign in to access your Enterprise workspace.",
              emailPlaceholder: "you@yourbusiness.com",
              badge: "Enterprise",
              initialEmail: searchParams.get("email") ?? "",
              initialInfo: searchParams.get("activated")
                ? "Your account is ready. Sign in with the password you created."
                : searchParams.get("already")
                  ? "This account is already active. Sign in to continue."
                  : "",
              helperText: "Need access to your organisation? Contact your Enterprise Administrator.",
              backPrompt: "Not an Enterprise user?",
              backLabel: "Back to portal selection",
              onBack: () => router.push("/"),
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
              subtitle: "Sign in to list surplus food, manage collections and track your impact.",
              emailPlaceholder: "you@yourbusiness.com",
              badge: "Surplus food",
              registerPrompt: "Don't have an account?",
              registerActionLabel: "Get started",
              onRegister: () => router.push("/business/register"),
              backPrompt: "Not here to list surplus?",
              backLabel: "Back to portal selection",
              onBack: () => router.push("/"),
              onSubmit: async (credentials) => {
                await loginBusiness(credentials.email, credentials.password);
                router.replace("/business/home");
              },
            }}
          />
        ) : null}

        {portal === "admin" ? (
          <AdminLoginForm
            onBack={() => router.push("/")}
            onSubmit={async (credentials) => {
              await loginAdmin(credentials);
              router.push("/admin/dashboard");
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
