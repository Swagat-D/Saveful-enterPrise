"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { StoreBadges } from "@/components/business/StoreBadges";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { businessRoleLabel, getBusinessSidebarLinks } from "@/config/businessSidebar";
import {
  ensureLiveBusinessSession,
  getBusinessSession,
  logoutBusiness,
  useBusinessSession,
} from "@/lib/businessAuth";

function isPublicBusinessPath(pathname: string) {
  if (pathname === "/business") return true;
  if (pathname === "/business/login") return true;
  if (pathname === "/business/register" || pathname.startsWith("/business/register/")) return true;
  if (pathname === "/business/verify" || pathname.startsWith("/business/verify/")) return true;
  if (pathname.startsWith("/business/billing")) return true;
  return false;
}

export function BusinessShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const subscribed = useBusinessSession();
  const [ready, setReady] = useState(false);
  const publicPath = isPublicBusinessPath(pathname);
  const isLogin = pathname === "/business/login";
  const user = ready ? subscribed ?? getBusinessSession() : null;
  const signedIn = Boolean(user);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || publicPath) return;
    const session = subscribed ?? getBusinessSession();
    if (!session) {
      router.replace("/");
      return;
    }
    void ensureLiveBusinessSession();
  }, [publicPath, ready, router, subscribed?.id]);

  if (isLogin) {
    return <div className="min-h-screen bg-[#FAF7F0]">{children}</div>;
  }

  if (!ready && !publicPath) {
    return <SavefulPageLoader message="Opening your business workspace…" />;
  }

  if (signedIn && !publicPath) {
    return (
      <DashboardLayout
        config={{
          role: "business",
          userName: user!.name,
          userEmail: user!.email,
          organization: user!.organization,
          organizationLogo: user!.logoUrl,
          roleLabel: businessRoleLabel(user),
          portalCaption: "Business",
          homeHref: "/business/home",
          profileHref: "/business/account",
          links: getBusinessSidebarLinks(user),
          onLogout: () => {
            logoutBusiness();
            router.replace("/");
          },
        }}
      >
        {children}
      </DashboardLayout>
    );
  }

  if (!publicPath) {
    return <SavefulPageLoader message="Opening your business workspace…" />;
  }

  return (
    <div className="min-h-screen bg-[#FAF7F0]">
      <header className="sticky top-0 z-30 border-b border-black/[0.06] bg-[#FAF7F0]/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href={signedIn ? "/business/home" : "/business"} className="flex items-center">
            <img src="/logo.png" alt="Saveful" className="h-9 w-auto" />
          </Link>
          <StoreBadges compact />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
