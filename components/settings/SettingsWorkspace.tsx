"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PortalShell } from "@/components/layout/PortalShell";
import { PortalPageShell } from "@/components/ui/Portal";
import { useSession } from "@/lib/auth";
import { roleHas, type RolePermissionId } from "@/lib/permissions";
import { cn } from "@/lib/utils";

export const SETTINGS_TABS: { href: string; label: string; permission: RolePermissionId }[] = [
  { href: "/settings/profile", label: "Organisation Profile", permission: "manageSettings" },
  { href: "/settings/structure", label: "Organisation Structure", permission: "manageStructure" },
  { href: "/settings/roles", label: "Roles & Permissions", permission: "manageSettings" },
  { href: "/settings/notifications", label: "Notifications", permission: "manageSettings" },
];

export function SettingsWorkspace({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const user = useSession();
  const tabs = SETTINGS_TABS.filter((tab) => !user || roleHas(user, tab.permission));

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <span className="text-gray-700">Enterprise Settings</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="border-b border-gray-100 px-4 py-3.5 sm:px-5">
            <h1 className="font-saveful-bold text-xl text-gray-900 sm:text-2xl">Enterprise Settings</h1>
          </header>

          <div className="flex gap-5 overflow-x-auto border-b border-gray-100 px-4 sm:px-5">
            {tabs.map((tab) => {
              const active = pathname === tab.href || (tab.href === "/settings/profile" && pathname === "/settings");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={cn(
                    "-mb-px border-b-2 py-2.5 font-saveful-semibold text-sm whitespace-nowrap",
                    active ? "border-saveful-green text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800",
                  )}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h2 className="font-saveful-bold text-lg text-gray-900">{title}</h2>
                {description ? <p className="mt-1 font-saveful text-xs text-gray-500">{description}</p> : null}
              </div>
              {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
            </div>
            {children}
          </div>
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}
