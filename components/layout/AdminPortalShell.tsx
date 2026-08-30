"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { getAdminSidebarLinks } from "@/config/sidebar";
import { adminFiltersToQuery, lastAdminFilters, refreshOrganisations, useAdminVersion } from "@/lib/admin";
import { ensureLiveSession, homePath, isAdminSession, logout, useSession } from "@/lib/auth";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function AdminPortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isClient = useIsClient();
  const user = useSession();
  useAdminVersion();
  const query = adminFiltersToQuery(lastAdminFilters());

  useEffect(() => {
    if (user && !isAdminSession(user)) router.replace(homePath(user));
  }, [router, user]);

  useEffect(() => {
    if (!user || !isAdminSession(user)) return;
    void ensureLiveSession().then((live) => {
      if (live) void refreshOrganisations().catch(() => undefined);
    });
  }, [user]);

  if (!isClient) {
    return <SavefulPageLoader message="Checking your admin session…" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F0] px-6">
        <p className="font-saveful text-sm text-gray-600">Sign in to the admin portal.</p>
        <Link
          href="/login"
          className="mt-4 rounded-xl bg-saveful-green px-4 py-2.5 font-saveful-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  if (!isAdminSession(user)) {
    return <SavefulPageLoader message="Opening enterprise portal…" />;
  }

  return (
    <DashboardLayout
      config={{
        role: "admin",
        userName: user.name,
        userEmail: user.email,
        organization: "Saveful",
        roleLabel: "Platform admin",
        portalCaption: "Admin",
        homeHref: `/admin/dashboard${query}`,
        profileHref: "/admin/account",
        links: getAdminSidebarLinks(),
        onLogout: () => {
          logout();
          router.push("/login");
        },
      }}
    >
      {children}
    </DashboardLayout>
  );
}
