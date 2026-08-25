"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, ListTree, Search, Shield, X } from "lucide-react";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { useSession } from "@/lib/auth";
import { sessionRole, userPermissions } from "@/lib/permissions";
import {
  ENTERPRISE_ROLES,
  accessSummaryText,
  assignableRoles,
  assignableUnits,
  canAssignEnterprise,
  describeAccessChange,
  emptyScope,
  formatInviteSent,
  getUser,
  resendInvitation,
  roleAllowsEnterprise,
  roleDescription,
  roleLabel,
  saveUser,
  scopeChips,
  setUserStatus,
  statusLabel,
  useUsersVersion,
} from "@/lib/users";
import type { DirectoryUserStatus, EnterpriseRole, UserAccessScope } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const inputClass =
  "h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white disabled:opacity-60";

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
  const actorRole: EnterpriseRole = sessionRole(session) ?? "group_admin";
  const roles = assignableRoles(actorRole);
  const adminCanEnterprise = canAssignEnterprise(actorRole);

  const initialScope = useMemo<UserAccessScope>(() => {
    if (existing) return { ...emptyScope(), ...existing.scope, enterprise: Boolean(existing.scope.enterprise) };
    if (presetSiteId) return { ...emptyScope(), siteIds: [presetSiteId] };
    return emptyScope();
  }, [existing, presetSiteId]);

  const [firstName, setFirstName] = useState(existing?.firstName ?? "");
  const [lastName, setLastName] = useState(existing?.lastName ?? "");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [mobile, setMobile] = useState(existing?.mobile ?? "");
  const [role, setRole] = useState<EnterpriseRole | "">(existing?.role ?? (presetSiteId ? "site_admin" : ""));
  const [scope, setScope] = useState<UserAccessScope>(initialScope);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<ReturnType<typeof describeAccessChange> | true | null>(null);
  const [openScope, setOpenScope] = useState<ScopeChipKind | null>(null);

  if (userId && !existing) {
    return (
      <PortalShell>
        <PortalPageShell className="!space-y-3 sm:!space-y-3">
          <nav className="font-saveful text-xs text-gray-500">
            <Link href="/users" className="hover:text-saveful-green">
              Users & Access
            </Link>
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
  const selectedRole = role ? ENTERPRISE_ROLES.find((item) => item.id === role) : null;
  const enterpriseAllowed = Boolean(role && roleAllowsEnterprise(role) && adminCanEnterprise);
  const entireEnterprise = Boolean(role === "enterprise_super_admin" || (enterpriseAllowed && scope.enterprise));
  const chips = scopeChips(scope);

  const applyRole = (next: EnterpriseRole | "") => {
    setRole(next);
    if (next === "enterprise_super_admin") {
      setScope({ enterprise: true });
      return;
    }
    if (next && !roleAllowsEnterprise(next)) {
      setScope((prev) => ({ ...prev, enterprise: false }));
    }
  };

  const toggle = (kind: ScopeChipKind, id: string) => {
    const key = kind === "group" ? "groupIds" : kind === "territory" ? "territoryIds" : kind === "cluster" ? "clusterIds" : "siteIds";
    setScope((prev) => {
      const list = prev[key] ?? [];
      return {
        ...prev,
        enterprise: false,
        [key]: list.includes(id) ? list.filter((item) => item !== id) : [...list, id],
      };
    });
  };

  const resolvedScope = (): UserAccessScope => {
    if (!role) return scope;
    if (role === "enterprise_super_admin") return { enterprise: true };
    if (entireEnterprise) return { enterprise: true };
    return { ...scope, enterprise: false };
  };

  const persist = () => {
    if (!role) {
      setError("Please select a role.");
      return;
    }
    const nextScope = resolvedScope();
    const result = saveUser({ firstName, lastName, email, mobile, role, scope: nextScope }, existing?.id, session?.name || "Enterprise user");
    if (!result.ok) {
      setError(result.error);
      setConfirm(null);
      return;
    }
    setSaving(true);
    router.push("/users");
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;
    setError("");
    if (!role) {
      setError("Please select a role.");
      return;
    }
    if (existing) {
      const change = describeAccessChange(existing, { role, scope: resolvedScope() });
      if (change) {
        setConfirm(change);
        return;
      }
    }
    persist();
  };

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href="/users" className="hover:text-saveful-green">
            Users & Access
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">{creating ? "Add user" : existing?.name}</span>
        </nav>

        <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="border-b border-gray-100 px-4 py-4 sm:px-5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
                {creating ? "Add user" : "Edit user"}
              </h1>
              {existing ? <StatusPill status={existing.status} /> : null}
            </div>
            <p className="mt-1.5 font-saveful text-xs text-gray-500">
              {creating
                ? "Invite a user and define their access to your Enterprise. They create their own password."
                : "Update this person’s details, role, and access scope."}
            </p>
            {existing?.status === "invited" ? (
              <p className="mt-2 font-saveful text-xs text-amber-700">{formatInviteSent(existing.invitedAt)}</p>
            ) : null}
          </header>

          <div className="space-y-5 p-4 sm:p-6">
            {notice ? <p className="font-saveful text-sm text-saveful-green">{notice}</p> : null}
            {error ? <p className="font-saveful text-sm text-amber-700">{error}</p> : null}

            <FormSection step={1} title="User details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="First name" required>
                  <input
                    value={firstName}
                    onChange={(event) => setFirstName(event.target.value)}
                    placeholder="Enter first name"
                    className={inputClass}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="Last name" required>
                  <input
                    value={lastName}
                    onChange={(event) => setLastName(event.target.value)}
                    placeholder="Enter last name"
                    className={inputClass}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="Email" required className="sm:col-span-2">
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="Enter email address"
                    className={inputClass}
                    disabled={!canEdit}
                  />
                </Field>
                <Field label="Mobile (optional)" className="sm:col-span-2">
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(event) => setMobile(event.target.value)}
                    placeholder="Enter mobile number"
                    className={inputClass}
                    disabled={!canEdit}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection step={2} title="Role" hint="Choose what this user can do.">
              <Field label="Role" required>
                <select
                  value={role}
                  disabled={!canEdit}
                  onChange={(event) => applyRole(event.target.value as EnterpriseRole | "")}
                  className={inputClass}
                >
                  <option value="">Select role</option>
                  {ENTERPRISE_ROLES.filter((item) => roles.includes(item.id)).map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
              {selectedRole ? (
                <div className="mt-4 flex gap-3 rounded-xl border border-saveful-green/20 bg-saveful-green/[0.06] px-3.5 py-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saveful-green text-white">
                    <Shield className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-saveful-semibold text-sm text-gray-900">{selectedRole.label}</p>
                    <p className="mt-0.5 font-saveful text-xs leading-relaxed text-gray-600">{roleDescription(selectedRole.id)}</p>
                  </div>
                </div>
              ) : null}
            </FormSection>

            <FormSection step={3} title="Access scope" hint="Choose what this user can access.">
              <div className="grid gap-2 sm:grid-cols-2">
                <ScopeModeCard
                  title="Entire Enterprise"
                  hint="All groups, territories, clusters and sites"
                  selected={entireEnterprise}
                  disabled={!canEdit || !enterpriseAllowed}
                  onSelect={() => {
                    setOpenScope(null);
                    setScope({ enterprise: true });
                  }}
                />
                <ScopeModeCard
                  title="Selected areas"
                  hint="Choose one or more specific areas"
                  selected={!entireEnterprise}
                  disabled={!canEdit || role === "enterprise_super_admin"}
                  onSelect={() => setScope((prev) => ({ ...prev, enterprise: false }))}
                />
              </div>
              {!enterpriseAllowed && role ? (
                <p className="mt-2 font-saveful text-xs text-gray-500">
                  Entire Enterprise is not available for {roleLabel(role)}.
                </p>
              ) : null}

              {!entireEnterprise ? (
                <div className="mt-4 space-y-3">
                  <ScopeRow
                    id="group"
                    openId={openScope}
                    onOpenChange={setOpenScope}
                    label="Groups"
                    placeholder="Select one or more groups"
                    items={units.groups}
                    selected={scope.groupIds ?? []}
                    onToggle={(id) => toggle("group", id)}
                    disabled={!canEdit}
                  />
                  <ScopeRow
                    id="territory"
                    openId={openScope}
                    onOpenChange={setOpenScope}
                    label="Territories"
                    placeholder="Select one or more territories"
                    items={units.territories}
                    selected={scope.territoryIds ?? []}
                    onToggle={(id) => toggle("territory", id)}
                    disabled={!canEdit}
                  />
                  <ScopeRow
                    id="cluster"
                    openId={openScope}
                    onOpenChange={setOpenScope}
                    label="Clusters"
                    placeholder="Select one or more clusters"
                    items={units.clusters}
                    selected={scope.clusterIds ?? []}
                    onToggle={(id) => toggle("cluster", id)}
                    disabled={!canEdit}
                  />
                  <ScopeRow
                    id="site"
                    openId={openScope}
                    onOpenChange={setOpenScope}
                    label="Sites"
                    placeholder="Select one or more sites"
                    items={units.sites.map((site) => ({ id: site.id, name: site.name }))}
                    selected={scope.siteIds ?? []}
                    onToggle={(id) => toggle("site", id)}
                    disabled={!canEdit}
                  />
                </div>
              ) : null}

              <div className="mt-4 rounded-xl border border-dashed border-saveful-green/35 bg-saveful-green/[0.04] px-3.5 py-3">
                <div className="flex gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saveful-green text-white">
                    <ListTree className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-saveful-semibold text-sm text-gray-900">Access summary</p>
                    <p className="mt-0.5 font-saveful text-xs leading-relaxed text-gray-600">
                      {entireEnterprise ? "This user will have access to the entire Enterprise." : accessSummaryText(scope)}
                    </p>
                    {!entireEnterprise && chips.length ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {chips.map((chip) => (
                          <button
                            key={chip.key}
                            type="button"
                            disabled={!canEdit}
                            onClick={() => toggle(chip.kind, chip.id)}
                            className="inline-flex items-center gap-1 rounded-full bg-saveful-green/10 px-2.5 py-1 font-saveful text-xs text-saveful-green"
                          >
                            {chip.label}
                            <X className="h-3 w-3" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </FormSection>
          </div>

          <footer className="flex flex-col-reverse gap-2 border-t border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex flex-wrap gap-2">
              {existing?.status === "invited" && permissions.resend ? (
                <button
                  type="button"
                  onClick={() => {
                    const result = resendInvitation(existing.id, session?.name || "Enterprise user");
                    setNotice(result.ok ? "Invitation resent. The previous activation link no longer works." : result.error);
                  }}
                  className="inline-flex h-10 items-center rounded-xl px-3 font-saveful-semibold text-sm text-saveful-green hover:underline"
                >
                  Resend invitation
                </button>
              ) : null}
              {existing && permissions.deactivate ? (
                <button
                  type="button"
                  onClick={() => setUserStatus(existing.id, existing.status === "deactivated" ? "active" : "deactivated", session?.name || "Enterprise user")}
                  className="inline-flex h-10 items-center rounded-xl px-3 font-saveful-semibold text-sm text-gray-600 hover:underline"
                >
                  {existing.status === "deactivated" ? "Reactivate" : "Deactivate"}
                </button>
              ) : null}
            </div>
            <div className="flex justify-end gap-2">
              <Link
                href="/users"
                className="inline-flex h-10 items-center rounded-xl border border-black/[0.06] px-4 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Cancel
              </Link>
              {canEdit ? (
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex h-10 items-center rounded-xl bg-saveful-green px-4 font-saveful-semibold text-sm text-white disabled:opacity-60"
                >
                  {saving ? "Saving…" : creating ? "Send invitation" : "Save changes"}
                </button>
              ) : null}
            </div>
          </footer>
        </form>
      </PortalPageShell>

      {confirm && confirm !== true ? (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border border-black/[0.05] bg-white p-5 shadow-xl">
            <h2 className="font-saveful-bold text-lg text-gray-900">{confirm.title}</h2>
            <p className="mt-2 font-saveful text-sm leading-relaxed text-gray-600">{confirm.detail}</p>
            <p className="mt-2 font-saveful text-xs text-gray-500">This change will be recorded in the Enterprise audit trail.</p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                className="inline-flex h-10 items-center rounded-xl border border-black/[0.06] px-4 font-saveful-semibold text-sm text-gray-800"
              >
                Back
              </button>
              <button
                type="button"
                onClick={persist}
                className="inline-flex h-10 items-center rounded-xl bg-saveful-green px-4 font-saveful-semibold text-sm text-white"
              >
                Confirm changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}

type ScopeChipKind = "group" | "territory" | "cluster" | "site";

function FormSection({
  step,
  title,
  hint,
  children,
}: {
  step: number;
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="mb-3 flex items-start gap-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-saveful-green font-saveful-bold text-xs text-white">
          {step}
        </span>
        <div>
          <h2 className="font-saveful-bold text-base text-gray-900">{title}</h2>
          {hint ? <p className="mt-0.5 font-saveful text-xs text-gray-500">{hint}</p> : null}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
    </label>
  );
}

function ScopeModeCard({
  title,
  hint,
  selected,
  disabled,
  onSelect,
}: {
  title: string;
  hint: string;
  selected: boolean;
  disabled?: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        "rounded-xl border px-3.5 py-3 text-left transition disabled:opacity-50",
        selected
          ? "border-saveful-green/40 bg-saveful-green/[0.06] ring-1 ring-saveful-green/15"
          : "border-black/[0.06] bg-[#F7F6F2] hover:border-saveful-green/25",
      )}
    >
      <span className="flex items-center gap-2">
        <span
          className={cn(
            "flex h-4 w-4 items-center justify-center rounded-full border",
            selected ? "border-saveful-green bg-saveful-green" : "border-gray-300 bg-white",
          )}
        >
          {selected ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : null}
        </span>
        <span className="font-saveful-semibold text-sm text-gray-900">{title}</span>
      </span>
      <span className="mt-1 block pl-6 font-saveful text-xs text-gray-500">{hint}</span>
    </button>
  );
}

function ScopeRow({
  id,
  openId,
  onOpenChange,
  label,
  placeholder,
  items,
  selected,
  onToggle,
  disabled,
}: {
  id: ScopeChipKind;
  openId: ScopeChipKind | null;
  onOpenChange: (id: ScopeChipKind | null) => void;
  label: string;
  placeholder: string;
  items: { id: string; name: string }[];
  selected: string[];
  onToggle: (id: string) => void;
  disabled?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const open = openId === id;
  const chosen = items.filter((item) => selected.includes(item.id));
  const visible = items.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => {
      if (root.current && !root.current.contains(event.target as Node)) onOpenChange(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(null);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <div className="grid items-start gap-2 sm:grid-cols-[7.5rem_1fr]">
      <p className="pt-2.5 font-saveful-semibold text-sm text-gray-800">{label}</p>
      <div ref={root} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          onClick={() => onOpenChange(open ? null : id)}
          className={cn(
            "flex min-h-11 w-full items-center justify-between gap-2 rounded-xl border bg-[#F7F6F2] px-3 py-1.5 text-left transition disabled:opacity-60",
            open ? "border-saveful-green/40 bg-white ring-2 ring-saveful-green/10" : "border-black/[0.06] hover:border-saveful-green/25",
          )}
        >
          <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {chosen.length ? (
              chosen.slice(0, 2).map((item) => (
                <span
                  key={item.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-full bg-white px-2 py-0.5 font-saveful text-xs text-gray-800 shadow-sm ring-1 ring-black/[0.06]"
                >
                  <span className="truncate">{item.name}</span>
                </span>
              ))
            ) : (
              <span className="font-saveful text-sm text-gray-400">{placeholder}</span>
            )}
            {chosen.length > 2 ? (
              <span className="font-saveful text-xs text-gray-500">+{chosen.length - 2} more</span>
            ) : null}
          </span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition", open && "rotate-180 text-saveful-green")} />
        </button>

        {open ? (
          <div className="absolute z-30 mt-1.5 w-full overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_12px_32px_rgba(16,24,40,0.12)]">
            <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
              <p className="font-saveful-semibold text-sm text-gray-900">Select {label.toLowerCase()}</p>
              <button
                type="button"
                onClick={() => onOpenChange(null)}
                className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-[#F7F6F2] hover:text-gray-700"
                aria-label={`Close ${label}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="relative border-b border-gray-100 px-3 py-2">
              <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={`Search ${label.toLowerCase()}`}
                className="h-9 w-full rounded-lg bg-[#F7F6F2] pl-8 pr-3 font-saveful text-sm outline-none focus:ring-2 focus:ring-saveful-green/15"
              />
            </div>
            <div className="max-h-52 overflow-y-auto p-1.5">
              {visible.length ? (
                visible.map((item) => {
                  const checked = selected.includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onToggle(item.id)}
                      className={cn(
                        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition",
                        checked ? "bg-saveful-green/[0.07]" : "hover:bg-[#F7F6F2]",
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-4 w-4 items-center justify-center rounded border",
                          checked ? "border-saveful-green bg-saveful-green text-white" : "border-gray-300 bg-white",
                        )}
                      >
                        {checked ? <Check className="h-3 w-3" /> : null}
                      </span>
                      <span className="font-saveful text-sm text-gray-900">{item.name}</span>
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-center font-saveful text-sm text-gray-500">No matches</p>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2">
              <button
                type="button"
                disabled={!selected.length}
                onClick={() => selected.forEach((id) => onToggle(id))}
                className="font-saveful-semibold text-xs text-gray-500 hover:text-gray-800 disabled:opacity-40"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => onOpenChange(null)}
                className="inline-flex h-8 items-center rounded-lg bg-saveful-green px-3 font-saveful-semibold text-xs text-white"
              >
                Done
              </button>
            </div>
          </div>
        ) : null}
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
