"use client";

import { AdminPortalShell } from "@/components/layout/AdminPortalShell";
import { PortalPageShell } from "@/components/ui/Portal";
import { useSession } from "@/lib/auth";

export default function AdminAccountPage() {
  const user = useSession();
  return (
    <AdminPortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <span className="text-gray-700">My Profile</span>
        </nav>
        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <h1 className="font-saveful-bold text-xl text-gray-900">Admin profile</h1>
          <p className="mt-2 font-saveful text-sm text-gray-500">
            You are signed in to the Saveful admin portal. Organisation settings stay in the Enterprise portal.
          </p>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#F7F6F2] px-3.5 py-3">
              <dt className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Name</dt>
              <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">{user?.name ?? "—"}</dd>
            </div>
            <div className="rounded-xl bg-[#F7F6F2] px-3.5 py-3">
              <dt className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Email</dt>
              <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">{user?.email ?? "—"}</dd>
            </div>
          </dl>
        </section>
      </PortalPageShell>
    </AdminPortalShell>
  );
}
