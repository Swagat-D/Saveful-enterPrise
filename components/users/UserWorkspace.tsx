"use client";

import { useMemo, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { useSession } from "@/lib/auth";
import { userPermissions } from "@/lib/permissions";
import {
  ENTERPRISE_ROLES,
  assignableRoles,
  assignableUnits,
  emptyScope,
  formatInviteSent,
  formatScope,
  getUser,
  resendInvitation,
  roleDescription,
  roleLabel,
  saveUser,
  setUserStatus,
  statusLabel,
  useUsersVersion,
} from "@/lib/users";
import type { DirectoryUser, DirectoryUserStatus, EnterpriseRole, UserAccessScope } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white";

export function UserWorkspace({
  userId,
  presetSiteId,
}: {
  userId?: string;
  presetSiteId?: string;
}) {
  const router = useRouter();
  const session = useSession();
  const permissions = userPermissions(session);
  useUsersVersion();
  const existing = userId ? getUser(userId) : null;
  const creating = !userId;
  const units = assignableUnits();
  const roles = assignableRoles("head_admin");

  const initialScope = useMemo<UserAccessScope>(() => {
    if (existing) return { ...emptyScope(), ...existing.scope, enterprise: Boolean(existing.scope.enterprise) };
    if (presetSiteId) return { ...emptyScope(), siteIds: [presetSiteId] };
    return emptyScope();
  }, [existing, presetSiteId]);

  const [name, setName] = useState(existing?.name ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [role, setRole] = useState<EnterpriseRole>(existing?.role ?? (presetSiteId ? "site_admin" : "site_admin"));
  const [scope, setScope] = useState<UserAccessScope>(initialScope);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  if (userId && !existing) {
    return (
      <PortalShell>
        <PortalPageShell className="!space-y-3 sm:!space-y-3">
          <nav className="font-saveful text-xs text-gray-500">
            <Link href="/users" className="hover:text-saveful-green">Users & Access</Link>
            <span className="px-1.5 text-gray-300">/</span>
            <span className="text-gray-700">Not found</span>
          </nav>
          <section className="rounded-2xl border border-black/[0.05] bg-white p-5">
            <p className="font-saveful text-sm text-gray-600">This user is not in your Enterprise directory.</p>
          </section>
        </PortalPageShell>
      </PortalShell>
    );
  }

  const canEdit = creating ? permissions.add : permissions.edit;
  const current = existing as DirectoryUser | null;

  const toggle = (key: keyof Pick<UserAccessScope, "groupIds" | "territoryIds" | "clusterIds" | "siteIds">, id: string) => {
    setScope((prev) => {
      const list = prev[key] ?? [];
      return { ...prev, enterprise: false, [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id] };
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    const result = saveUser({ name, email, role, scope: role === "head_admin" ? { enterprise: true } : scope }, existing?.id);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSaving(true);
    router.push(creating ? `/users/${result.id}` : "/users");
  };

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href="/users" className="hover:text-saveful-green">
            Users & Access
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">{creating ? "Add user" : current?.name}</span>
        </nav>

        <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
                  {creating ? "Add user" : current?.name}
                </h1>
                {current ? <StatusPill status={current.status} /> : null}
              </div>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                {creating
                  ? "They receive an invitation and choose their own password."
                  : `${roleLabel(role)} · ${formatScope(role === "head_admin" ? { enterprise: true } : scope)}`}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {current?.status === "invited" && permissions.resend ? (
                <button
                  type="button"
                  onClick={() => {
                    const result = resendInvitation(current.id);
                    setNotice(result.ok ? "Invitation resent. The previous activation link no longer works." : result.error);
                  }}
                  className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
                >
                  Resend invitation
                </button>
              ) : null}
              {current && permissions.deactivate ? (
                <button
                  type="button"
                  onClick={() => setUserStatus(current.id, current.status === "deactivated" ? "active" : "deactivated")}
                  className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
                >
                  {current.status === "deactivated" ? "Reactivate" : "Deactivate"}
                </button>
              ) : null}
              <Link
                href="/users"
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Cancel
              </Link>
              {canEdit ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : creating ? "Send invitation" : "Save changes"}
                </button>
              ) : null}
            </div>
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            {notice ? <p className="font-saveful text-sm text-saveful-green">{notice}</p> : null}
            {error ? <p className="font-saveful text-sm text-amber-700">{error}</p> : null}

            {current?.status === "invited" ? (
              <section className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
                <p className="font-saveful-semibold text-sm text-gray-900">{formatInviteSent(current.invitedAt)}</p>
                <p className="mt-1 font-saveful text-xs text-gray-600">
                  Resending creates a new activation link and invalidates the previous one.
                </p>
              </section>
            ) : null}

            {current?.status === "deactivated" ? (
              <section className="rounded-xl border border-gray-200 bg-[#F7F6F2] px-3.5 py-3">
                <p className="font-saveful-semibold text-sm text-gray-900">Access removed</p>
                <p className="mt-1 font-saveful text-xs text-gray-600">
                  This person cannot sign in. Their historical activity and audit records stay in place.
                </p>
              </section>
            ) : null}

            <FormSection title="1. Person" hint="Name and email for the invitation">
              <div className="grid gap-3 p-3.5 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Name</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} className={inputClass} disabled={!canEdit} />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Email</span>
                  <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className={inputClass} disabled={!canEdit} />
                </label>
              </div>
            </FormSection>

            <FormSection title="2. Role" hint="What this person can do">
              <div className="space-y-2 p-3.5">
                <select
                  value={role}
                  disabled={!canEdit}
                  onChange={(event) => {
                    const next = event.target.value as EnterpriseRole;
                    setRole(next);
                    if (next === "head_admin") setScope({ enterprise: true });
                  }}
                  className={inputClass}
                >
                  {ENTERPRISE_ROLES.filter((item) => roles.includes(item.id)).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <p className="font-saveful text-xs text-gray-500">{roleDescription(role)}</p>
              </div>
            </FormSection>

            <FormSection title="3. Scope" hint="What Enterprise data and sites they can access">
              <div className="space-y-4 p-3.5">
                <p className="font-saveful text-xs text-gray-500">
                  Scope is independent of role. A user may have access across one or multiple Groups, Territories, Clusters or Sites.
                  You can only assign scope you are authorised to administer.
                </p>
                {role === "head_admin" ? (
                  <p className="rounded-lg bg-[#F7F6F2] px-3 py-2 font-saveful text-sm text-gray-700">Entire Enterprise</p>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    <ScopeList
                      label="Groups"
                      items={units.groups}
                      selected={scope.groupIds ?? []}
                      onToggle={(id) => toggle("groupIds", id)}
                      disabled={!canEdit}
                    />
                    <ScopeList
                      label="Territories"
                      items={units.territories}
                      selected={scope.territoryIds ?? []}
                      onToggle={(id) => toggle("territoryIds", id)}
                      disabled={!canEdit}
                    />
                    <ScopeList
                      label="Clusters"
                      items={units.clusters}
                      selected={scope.clusterIds ?? []}
                      onToggle={(id) => toggle("clusterIds", id)}
                      disabled={!canEdit}
                    />
                    <ScopeList
                      label="Sites"
                      items={units.sites.map((site) => ({ id: site.id, name: site.name }))}
                      selected={scope.siteIds ?? []}
                      onToggle={(id) => toggle("siteIds", id)}
                      disabled={!canEdit}
                    />
                  </div>
                )}
              </div>
            </FormSection>
          </div>
        </form>
      </PortalPageShell>
    </PortalShell>
  );
}

function FormSection({ title, hint, children }: { title: string; hint: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
        <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
        <span className="truncate font-saveful text-[11px] text-gray-400">{hint}</span>
      </div>
      {children}
    </section>
  );
}

function ScopeList({
  label,
  items,
  selected,
  onToggle,
  disabled,
}: {
  label: string;
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <p className="mb-2 font-saveful-semibold text-xs text-gray-600">{label}</p>
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-gray-100 p-2">
        {items.map((item) => {
          const checked = selected.includes(item.id);
          return (
            <label key={item.id} className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 hover:bg-[#F7F6F2]">
              <input type="checkbox" checked={checked} disabled={disabled} onChange={() => onToggle(item.id)} />
              <span className="font-saveful text-sm text-gray-800">{item.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: DirectoryUserStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F7F6F2] px-2 py-0.5 font-saveful text-[11px] text-gray-700">
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "active" && "bg-saveful-green",
          status === "invited" && "bg-amber-500",
          status === "deactivated" && "bg-gray-400",
        )}
      />
      {statusLabel(status)}
    </span>
  );
}
