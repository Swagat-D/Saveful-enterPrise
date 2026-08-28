"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Calculator,
  ChartColumn,
  Check,
  Circle,
  Download,
  Headphones,
  Pencil,
  Plus,
  Shield,
  UserRound,
  X,
} from "lucide-react";
import { AdminPage, AdminSection, StatusPill, useAdminFilters } from "@/components/admin/AdminChrome";
import { useSession } from "@/lib/auth";
import { useAdminAuditVersion } from "@/lib/adminAudit";
import {
  ADMIN_PERMISSION_GROUPS,
  ADMIN_PERMISSIONS,
  buildAdminRolesModel,
  createAdminRole,
  exportAdminRolesCsv,
  isRestrictedPermission,
  roleAccessLevel,
  staffForRole,
  updateAdminRolePermission,
  updateAdminRoleStatus,
  useAdminRolesVersion,
  type AdminAccessLevel,
  type AdminInternalRole,
  type AdminRoleScope,
} from "@/lib/adminRoles";
import { formatDisplayDate, formatDisplayDateTime } from "@/lib/dates";
import { formatCount } from "@/lib/impact";
import { cn } from "@/lib/utils";

const ROLE_ICON: Record<string, typeof Shield> = {
  super_admin: Shield,
  operations_admin: UserRound,
  customer_support: Headphones,
  insights_reporting: ChartColumn,
  commercial_admin: Calculator,
};

const ACCESS_COPY: Record<AdminAccessLevel, { label: string; className: string }> = {
  full: { label: "Full", className: "text-saveful-green" },
  view: { label: "View", className: "text-sky-600" },
  limited: { label: "Limited", className: "text-amber-600" },
  none: { label: "None", className: "text-red-400" },
};

function parseRoleId(value: string | null, fallback: string) {
  return value || fallback;
}

export function AdminRoles() {
  useAdminRolesVersion();
  useAdminAuditVersion();
  const user = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { query } = useAdminFilters();
  const model = buildAdminRolesModel();
  const selectedId = parseRoleId(searchParams.get("role"), model.roles[0]?.id ?? "super_admin");
  const selected = model.roles.find((role) => role.id === selectedId) ?? model.roles[0];
  const [q, setQ] = useState("");
  const [scopeFilter, setScopeFilter] = useState<"all" | AdminRoleScope>("all");
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState({ label: "", description: "", scope: "global" as AdminRoleScope });

  const filtered = useMemo(() => {
    const queryText = q.trim().toLowerCase();
    return model.roles.filter((role) => {
      if (scopeFilter !== "all" && role.scope !== scopeFilter) return false;
      if (queryText && !`${role.label} ${role.description}`.toLowerCase().includes(queryText)) return false;
      return true;
    });
  }, [model.roles, q, scopeFilter]);

  const selectRole = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (id === "super_admin") params.delete("role");
    else params.set("role", id);
    const next = params.toString();
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
  };

  const create = () => {
    if (!draft.label.trim()) return;
    const created = createAdminRole(draft, user);
    setDraft({ label: "", description: "", scope: "global" });
    setCreating(false);
    selectRole(created.id);
  };

  const metrics = [
    { label: "Total admin users", value: formatCount(model.metrics.users), hint: `${model.metrics.newAdmins} new in 30 days` },
    { label: "Active roles", value: formatCount(model.metrics.activeRoles), hint: "No unused system roles" },
    { label: "New admins (30 days)", value: formatCount(model.metrics.newAdmins), hint: "Joined in the last 30 days" },
    { label: "Granted permissions", value: formatCount(model.metrics.customPermissions), hint: "Across all roles" },
    { label: "High-risk access", value: formatCount(model.metrics.highRiskUsers), hint: "Roles, commercial or methodology" },
    { label: "Access reviews", value: formatCount(model.metrics.accessReviews), hint: `Next due ${model.metrics.nextReview}` },
  ];

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Admin Roles & Permissions"
      hint="Control what Saveful’s own staff can see and administer. Customer Enterprise roles stay separate."
      actions={
        <button
          type="button"
          onClick={() => setCreating((open) => !open)}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3 font-saveful-semibold text-sm text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          Create role
        </button>
      }
    >
      <p className="font-saveful text-xs text-gray-500">Last updated {formatDisplayDateTime(model.latest)}</p>

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {metrics.map((item) => (
          <article key={item.label} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3">
            <p className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">{item.label}</p>
            <p className="mt-2 font-saveful-bold text-lg tabular-nums leading-none text-gray-900">{item.value}</p>
            <p className="mt-1.5 truncate font-saveful text-[11px] text-gray-500">{item.hint}</p>
          </article>
        ))}
      </div>

      <div className="flex gap-2 rounded-xl bg-saveful-green/[0.06] px-3 py-2.5">
        <Shield className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
        <p className="font-saveful text-xs leading-relaxed text-gray-600">
          Role is what the Saveful user can do. Scope can limit which organisations they work on. Permissions, not the role
          name, determine access. <span className="font-saveful-semibold">Plans & Accounts</span> and{" "}
          <span className="font-saveful-semibold">Impact Methodology</span> are separately restricted. Every permission
          change is written to the{" "}
          <Link href={`/admin/audit${query}`} className="font-saveful-semibold text-saveful-green hover:underline">
            Platform Audit Log
          </Link>
          .
        </p>
      </div>

      {creating ? (
        <AdminSection title="Create Saveful role">
          <div className="grid gap-3 p-3.5 sm:grid-cols-2">
            <label className="block sm:col-span-1">
              <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Role name</span>
              <input
                value={draft.label}
                onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value }))}
                className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40"
                placeholder="e.g. Regional Support"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Scope</span>
              <select
                value={draft.scope}
                onChange={(event) => setDraft((current) => ({ ...current, scope: event.target.value as AdminRoleScope }))}
                className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none"
              >
                <option value="global">Global</option>
                <option value="organisation">Organisation</option>
              </select>
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">What they can do</span>
              <input
                value={draft.description}
                onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
                className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40"
                placeholder="Starts with View Dashboard only. Grant permissions after create."
              />
            </label>
            <div className="flex gap-2 sm:col-span-2">
              <button type="button" onClick={create} className="h-9 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white">
                Save role
              </button>
              <button type="button" onClick={() => setCreating(false)} className="h-9 rounded-lg px-3 font-saveful-semibold text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </div>
        </AdminSection>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="space-y-3 xl:col-span-8">
          <AdminSection
            title="Roles"
            action={
              <div className="flex items-center gap-2">
                <input
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search roles…"
                  className="h-8 w-36 rounded-lg border border-black/[0.06] bg-white px-2.5 font-saveful text-xs outline-none sm:w-44"
                />
                <select
                  value={scopeFilter}
                  onChange={(event) => setScopeFilter(event.target.value as "all" | AdminRoleScope)}
                  className="h-8 rounded-lg border border-black/[0.06] bg-white px-2 font-saveful text-xs outline-none"
                >
                  <option value="all">All scopes</option>
                  <option value="global">Global</option>
                  <option value="organisation">Organisation</option>
                </select>
                <button type="button" onClick={exportAdminRolesCsv} className="inline-flex h-8 items-center gap-1 rounded-lg border border-black/[0.06] px-2 font-saveful-semibold text-xs text-gray-700 hover:bg-white">
                  <Download className="h-3.5 w-3.5" />
                  Export
                </button>
              </div>
            }
          >
            <div className="overflow-x-auto">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="px-3 py-2.5 font-saveful">Role</th>
                    <th className="px-3 py-2.5 font-saveful">Users</th>
                    <th className="px-3 py-2.5 font-saveful">Scope</th>
                    <th className="px-3 py-2.5 font-saveful">Status</th>
                    <th className="px-3 py-2.5 font-saveful">Updated</th>
                    <th className="px-3 py-2.5 font-saveful">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((role) => {
                    const Icon = ROLE_ICON[role.id] ?? UserRound;
                    const active = role.id === selected.id;
                    return (
                      <tr
                        key={role.id}
                        className={cn("border-b border-gray-50 last:border-0", active && "bg-saveful-green/[0.04]")}
                      >
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => selectRole(role.id)} className="flex items-start gap-2.5 text-left">
                            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
                              <Icon className="h-3.5 w-3.5" />
                            </span>
                            <span>
                              <span className="block font-saveful-semibold text-sm text-gray-900">{role.label}</span>
                              <span className="block font-saveful text-xs text-gray-500">{role.description}</span>
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-3 font-saveful text-sm tabular-nums text-gray-800">{role.users}</td>
                        <td className="px-3 py-3">
                          <StatusPill status={role.scope === "global" ? "Global" : "Organisation"} />
                        </td>
                        <td className="px-3 py-3">
                          <StatusPill status={role.status === "active" ? "Active" : "Deactivated"} />
                        </td>
                        <td className="px-3 py-3 font-saveful text-sm text-gray-600">{formatDisplayDate(role.updatedAt.slice(0, 10))}</td>
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button type="button" onClick={() => selectRole(role.id)} className="rounded-lg p-1.5 text-gray-500 hover:bg-[#F7F6F2]" aria-label={`Edit ${role.label}`}>
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {role.id !== "super_admin" ? (
                              <button
                                type="button"
                                onClick={() => updateAdminRoleStatus(role.id, role.status === "active" ? "inactive" : "active", user)}
                                className="rounded-lg px-2 py-1 font-saveful text-[11px] text-gray-500 hover:bg-[#F7F6F2]"
                              >
                                {role.status === "active" ? "Deactivate" : "Reactivate"}
                              </button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </AdminSection>

          <AdminSection title="Permissions matrix" action={<span className="font-saveful text-[11px] text-gray-400">Click a role to edit</span>}>
            <div className="flex flex-wrap gap-3 px-3.5 pt-3 font-saveful text-[11px] text-gray-500">
              <Legend tone="full" />
              <Legend tone="view" />
              <Legend tone="limited" />
              <Legend tone="none" />
            </div>
            <div className="overflow-x-auto px-2 pb-3 pt-1">
              <table className="min-w-full text-left">
                <thead>
                  <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                    <th className="px-2 py-2 font-saveful">Category</th>
                    {model.roles.map((role) => (
                      <th key={role.id} className="px-2 py-2 font-saveful">
                        <button type="button" onClick={() => selectRole(role.id)} className={cn("hover:text-saveful-green", role.id === selected.id && "text-saveful-green")}>
                          {role.label.replace("Saveful ", "")}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ADMIN_PERMISSION_GROUPS.map((group) => (
                    <tr key={group.id} className="border-b border-gray-50 last:border-0">
                      <td className="px-2 py-2.5 font-saveful text-sm text-gray-800">
                        {group.label}
                        {"restricted" in group && group.restricted ? (
                          <span className="ml-1.5 rounded-full bg-amber-50 px-1.5 py-0.5 font-saveful text-[10px] uppercase tracking-wide text-amber-700">Restricted</span>
                        ) : null}
                      </td>
                      {model.roles.map((role) => {
                        const level = roleAccessLevel(role, group.id);
                        return (
                          <td key={`${role.id}-${group.id}`} className="px-2 py-2.5">
                            <AccessMark level={level} />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminSection>
        </div>

        <div className="space-y-3 xl:col-span-4">
          <RoleEditor role={selected} />
          <AdminSection title="About this model">
            <ul className="space-y-2 px-3.5 py-3 font-saveful text-sm text-gray-600">
              <li>This is a Saveful internal model. It does not change Enterprise customer roles.</li>
              <li>Global roles apply across the platform. Organisation scope can be added when support work is limited.</li>
              <li>Commercial and methodology permissions are granted on their own, even to Insights or Operations.</li>
            </ul>
          </AdminSection>
          <AdminSection title="Recent role changes" action={<Link href={`/admin/audit${query}`} className="font-saveful-semibold text-xs text-saveful-green hover:underline">Audit →</Link>}>
            <ul>
              {model.recent.map((row) => (
                <li key={row.id} className="border-b border-gray-50 px-3.5 py-2.5 last:border-0">
                  <p className="font-saveful-semibold text-sm text-gray-900">{row.action}</p>
                  <p className="truncate font-saveful text-xs text-gray-500">{row.entity} · {row.detail}</p>
                  <p className="mt-0.5 font-saveful text-[11px] text-gray-400">{formatDisplayDateTime(row.at)}</p>
                </li>
              ))}
              {model.recent.length === 0 ? <li className="px-3.5 py-6 font-saveful text-sm text-gray-400">No role changes yet.</li> : null}
            </ul>
          </AdminSection>
          <AdminSection title="Role health">
            <div className="px-3.5 py-3">
              <div className="mb-3 flex gap-4">
                <HealthStat label="Active" value={model.health.active} />
                <HealthStat label="Inactive" value={model.health.inactive} />
                <HealthStat label="Over-privileged" value={model.health.overPrivileged} />
                <HealthStat label="No recent review" value={model.health.noReview} />
              </div>
              <p className="font-saveful text-xs text-gray-500">
                Over-privileged means a non–Super Admin role can manage roles, or both commercial and methodology.
              </p>
            </div>
          </AdminSection>
        </div>
      </div>

      <p className="rounded-xl border border-sky-100 bg-sky-50/70 px-3.5 py-2.5 font-saveful text-xs text-sky-800">
        Permission changes are audited immediately. Super Admin commercial, methodology, and role-management permissions cannot be removed.
      </p>
    </AdminPage>
  );
}

function RoleEditor({ role }: { role: AdminInternalRole & { users: number } }) {
  const user = useSession();
  const locked = role.id === "super_admin";
  const Icon = ROLE_ICON[role.id] ?? UserRound;
  const staff = staffForRole(role.id);

  return (
    <AdminSection title="Selected role">
      <div className="border-b border-gray-100 px-3.5 py-3">
        <div className="flex items-start gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h3 className="font-saveful-bold text-base text-gray-900">{role.label}</h3>
            <p className="mt-1 font-saveful text-xs leading-relaxed text-gray-500">{role.description}</p>
            <p className="mt-2 font-saveful text-xs text-gray-500">
              {role.users} assigned · {role.scope === "global" ? "Global" : "Organisation"} scope
            </p>
          </div>
        </div>
      </div>
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 bg-[#F7F6F2] font-saveful text-[11px] uppercase tracking-wide text-gray-500">
            <th className="px-3.5 py-2 font-saveful">Permission</th>
            <th className="px-3.5 py-2 font-saveful">Access</th>
          </tr>
        </thead>
        <tbody>
          {ADMIN_PERMISSIONS.map((permission) => {
            const allowed = role.permissions[permission.id];
            const restricted = isRestrictedPermission(permission.id);
            return (
              <tr key={permission.id} className="border-b border-gray-50 last:border-0">
                <td className="px-3.5 py-2">
                  <p className="font-saveful text-sm text-gray-800">{permission.label}</p>
                  {restricted ? <p className="font-saveful text-[10px] uppercase tracking-wide text-amber-700">Restricted</p> : null}
                </td>
                <td className="px-3.5 py-2">
                  {locked ? (
                    allowed ? <Check className="h-4 w-4 text-saveful-green" aria-label="Allowed" /> : <X className="h-4 w-4 text-gray-300" aria-label="Not allowed" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => updateAdminRolePermission(role.id, permission.id, !allowed, user)}
                      className={cn(
                        "inline-flex h-7 items-center rounded-full px-2 font-saveful-semibold text-[11px]",
                        allowed ? "bg-saveful-green/10 text-saveful-green" : "bg-[#F7F6F2] text-gray-400",
                      )}
                    >
                      {allowed ? "Allowed" : "Off"}
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {staff.length ? (
        <div className="border-t border-gray-100 px-3.5 py-3">
          <p className="mb-2 font-saveful-semibold text-[11px] uppercase tracking-[0.12em] text-gray-400">Assigned staff</p>
          <ul className="space-y-1.5">
            {staff.map((row) => (
              <li key={row.id} className="font-saveful text-sm text-gray-700">
                {row.name}
                <span className="text-gray-400"> · {row.email}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </AdminSection>
  );
}

function AccessMark({ level }: { level: AdminAccessLevel }) {
  if (level === "full") return <Check className="h-4 w-4 text-saveful-green" aria-label="Full access" />;
  if (level === "view") return <Circle className="h-3.5 w-3.5 fill-sky-500 text-sky-500" aria-label="View only" />;
  if (level === "limited") return <Circle className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-label="Limited access" />;
  return <Circle className="h-3.5 w-3.5 text-red-300" aria-label="No access" />;
}

function Legend({ tone }: { tone: AdminAccessLevel }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <AccessMark level={tone} />
      <span className={ACCESS_COPY[tone].className}>{ACCESS_COPY[tone].label}</span>
    </span>
  );
}

function HealthStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-saveful-bold text-lg tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1 font-saveful text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
