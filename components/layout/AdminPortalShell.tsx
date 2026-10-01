"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { getAdminSidebarLinks } from "@/config/sidebar";
import { adminFiltersToQuery, adminLoadError, enqueueAdminBackground, lastAdminFilters, refreshOrganisations, useAdminReady } from "@/lib/admin";
import { refreshAdminAudit } from "@/lib/adminAudit";
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
  const ready = useAdminReady();
  const loadError = adminLoadError();
  const query = adminFiltersToQuery(lastAdminFilters());

  useEffect(() => {
    if (user && !isAdminSession(user)) router.replace(homePath(user));
  }, [router, user]);

  useEffect(() => {
    if (!user || !isAdminSession(user)) return;
    void ensureLiveSession().then(async (live) => {
      if (!live) return;
      await refreshOrganisations().catch(() => undefined);
      enqueueAdminBackground(() => refreshAdminAudit());
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
          router.replace("/");
        },
      }}
    >
      {loadError ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">{loadError}</p>
      ) : null}
      {!ready ? (
        <SavefulPageLoader message="Loading Saveful…" fullScreen={false} className="min-h-[70vh]" />
      ) : (
        children
      )}
    </DashboardLayout>
  );
}
