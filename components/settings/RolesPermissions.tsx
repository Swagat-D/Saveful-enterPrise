"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Building2, ChartColumn, Check, Layers3, Shield, UserRound, X } from "lucide-react";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { ROLE_PERMISSIONS, roleHasId } from "@/lib/permissions";
import { ENTERPRISE_ROLES, countUsersByRole, useUsersVersion } from "@/lib/users";
import type { EnterpriseRole } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const ROLE_ICONS: Record<EnterpriseRole, typeof Shield> = {
  enterprise_super_admin: Shield,
  enterprise_admin: UserRound,
  group_admin: Layers3,
  reporting: ChartColumn,
  site_admin: Building2,
};

function parseRole(value: string | null): EnterpriseRole {
  return ENTERPRISE_ROLES.some((item) => item.id === value) ? (value as EnterpriseRole) : "enterprise_super_admin";
}

export function RolesPermissions() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  useUsersVersion();
  const selected = parseRole(searchParams.get("role"));
  const role = ENTERPRISE_ROLES.find((item) => item.id === selected) ?? ENTERPRISE_ROLES[0];
  const Icon = ROLE_ICONS[role.id];
  const users = countUsersByRole(role.id);

  const selectRole = (id: EnterpriseRole) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "enterprise_super_admin") params.delete("role");
    else params.set("role", id);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <SettingsWorkspace
      title="Roles & Permissions"
      description="Understand what each role can do across your Enterprise."
    >
      <div className="flex gap-2 rounded-xl bg-saveful-green/[0.06] px-3 py-2.5">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
        <p className="font-saveful text-xs leading-relaxed text-gray-600">
          Role determines what a user can do. Scope determines what they can access. User access and scope are managed
          from{" "}
          <Link href="/users" className="font-saveful-semibold text-saveful-green hover:underline">
            Users
          </Link>
          . Role definitions are set by Saveful and cannot be edited here.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[16.5rem_1fr]">
        <aside className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <p className="border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2 font-saveful-semibold text-[11px] uppercase tracking-[0.14em] text-gray-700">
            Select a role
          </p>
          <nav className="p-2">
            {ENTERPRISE_ROLES.map((item) => {
              const ItemIcon = ROLE_ICONS[item.id];
              const active = item.id === role.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectRole(item.id)}
                  className={cn(
                    "mb-1 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left last:mb-0",
                    active ? "bg-saveful-green/10 text-gray-900" : "text-gray-600 hover:bg-[#F7F6F2]",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full",
                      active ? "bg-saveful-green/15 text-saveful-green" : "bg-[#F7F6F2] text-gray-400",
                    )}
                  >
                    <ItemIcon className="h-3.5 w-3.5" />
                  </span>
                  <span className="font-saveful-semibold text-sm">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
                  <Icon className="h-4 w-4" />
                </span>
                <h3 className="font-saveful-bold text-lg text-gray-900">{role.label}</h3>
              </div>
              <p className="mt-2 font-saveful text-xs leading-relaxed text-gray-500">{role.description}</p>
            </div>
            <div className="shrink-0 text-left sm:text-right">
              <p className="font-saveful text-xs text-gray-500">
                Users with this role: <span className="font-saveful-semibold text-gray-800">{users}</span>
              </p>
              <Link
                href={`/users?role=${role.id}`}
                className="mt-1 inline-flex font-saveful-semibold text-xs text-saveful-green hover:underline"
              >
                View users →
              </Link>
            </div>
          </header>

          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 bg-[#F7F6F2] font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                <th className="px-4 py-2.5 font-saveful">Permission</th>
                <th className="px-4 py-2.5 font-saveful">Access</th>
              </tr>
            </thead>
            <tbody>
              {ROLE_PERMISSIONS.map((permission) => {
                const allowed = roleHasId(role.id, permission.id);
                return (
                  <tr key={permission.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-2.5 font-saveful text-sm text-gray-800">{permission.label}</td>
                    <td className="px-4 py-2.5">
                      {allowed ? (
                        <Check className="h-4 w-4 text-saveful-green" aria-label="Allowed" />
                      ) : (
                        <X className="h-4 w-4 text-gray-300" aria-label="Not allowed" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </SettingsWorkspace>
  );
}
