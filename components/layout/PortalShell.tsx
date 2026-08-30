"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { getEnterpriseSidebarLinks } from "@/config/sidebar";
import { ensureLiveSession, homePath, isAdminSession, logout, useSession } from "@/lib/auth";
import { refreshEnterpriseWorkspace } from "@/lib/enterpriseLive";
import { getOrganization, useOrganizationVersion } from "@/lib/organization";
import { useOrgStructureVersion } from "@/lib/orgStructure";
import { useUsersVersion } from "@/lib/users";
import { accessFromSession } from "@/lib/profile";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

function useIsClient() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function PortalShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isClient = useIsClient();
  const user = useSession();
  useOrganizationVersion();
  useUsersVersion();
  useOrgStructureVersion();
  const organization = getOrganization();

  useEffect(() => {
    if (isAdminSession(user)) router.replace(homePath(user));
  }, [router, user]);

  useEffect(() => {
    if (!user || isAdminSession(user)) return;
    void ensureLiveSession().then((live) => {
      if (live) void refreshEnterpriseWorkspace({ session: live }).catch(() => undefined);
    });
  }, [user]);

  if (!isClient) {
    return <SavefulPageLoader message="Checking your business session…" />;
  }

  if (isAdminSession(user)) {
    return <SavefulPageLoader message="Opening admin portal…" />;
  }

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F0] px-6">
        <p className="font-saveful text-sm text-gray-600">Sign in to manage your sites.</p>
        <Link
          href="/login"
          className="mt-4 rounded-xl bg-saveful-green px-4 py-2.5 font-saveful-semibold text-white"
        >
          Go to sign in
        </Link>
      </div>
    );
  }

  return (
    <DashboardLayout
      config={{
        role: "enterprise",
        userName: user.name,
        userEmail: user.email,
        organization: organization.name,
        organizationLogo: organization.logoDataUrl,
        roleLabel: accessFromSession(user).roleName,
        links: getEnterpriseSidebarLinks(user),
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
