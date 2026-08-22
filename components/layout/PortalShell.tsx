"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { getEnterpriseSidebarLinks } from "@/config/sidebar";
import { logout, useSession } from "@/lib/auth";
import { demoOrganization } from "@/lib/demo";
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

  if (!isClient) {
    return <SavefulPageLoader message="Checking your business session…" />;
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
        organization: demoOrganization.name,
        roleLabel: user.isHeadAdmin ? "Head admin" : "Enterprise user",
        links: getEnterpriseSidebarLinks(),
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
