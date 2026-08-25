"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { PortalShell } from "@/components/layout/PortalShell";
import { PortalPageShell } from "@/components/ui/Portal";
import { useSession } from "@/lib/auth";
import { roleHas, type RolePermissionId } from "@/lib/permissions";

export function RequireCapability({
  permission,
  children,
}: {
  permission: RolePermissionId;
  children: ReactNode;
}) {
  const user = useSession();
  if (!user) return children;
  if (roleHas(user, permission)) return children;

  return (
    <PortalShell>
      <PortalPageShell>
        <section className="rounded-2xl border border-black/[0.05] bg-white px-5 py-10 text-center shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h1 className="font-saveful-bold text-xl text-gray-900">You don’t have access</h1>
          <p className="mx-auto mt-2 max-w-md font-saveful text-sm text-gray-500">
            This page is limited to roles that include this permission. Ask an authorised administrator if you need a
            role or scope change.
          </p>
          <Link
            href="/dashboard"
            className="mt-5 inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
          >
            Back to dashboard
          </Link>
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}
