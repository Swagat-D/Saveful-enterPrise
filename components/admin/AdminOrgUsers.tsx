"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Search, UserPlus, X } from "lucide-react";
import { StatusPill, TablePager, type PageSize } from "@/components/admin/AdminChrome";
import { inviteAdminEnterpriseUser, setAdminEnterpriseUserRole } from "@/lib/api";
import {
  EMPTY_ADMIN_FILTERS,
  EMPTY_ADMIN_SITES_FILTERS,
  buildSitesDirectory,
  refreshOrganisationDetail,
  type AdminDirectorySite,
  type AdminOrgUser,
} from "@/lib/admin";
import { cn } from "@/lib/utils";

const ENTERPRISE_ROLES = [
  {
    id: "ENTERPRISE_ADMIN",
    label: "Enterprise Admin (View only)",
    hint: "Sees the dashboard, sites, insights and reports — for every site or only the sites you choose. Cannot add, edit or change anything.",
  },
  {
    id: "SUPER_ADMIN",
    label: "Enterprise Super Admin",
    hint: "Full control of the Enterprise, its sites, structure and users.",
  },
] as const;

type RoleId = (typeof ENTERPRISE_ROLES)[number]["id"];

const INPUT =
  "h-10 w-full rounded-lg border border-black/[0.08] bg-white px-3 font-saveful text-sm text-gray-900 outline-none focus:border-saveful-green";

function memberId(row: AdminOrgUser) {
  return /^\d+$/.test(row.id) ? Number(row.id) : null;
}

function errorText(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

function isViewOnly(row: AdminOrgUser) {
  return /enterprise admin/i.test(row.role) && !/super/i.test(row.role);
}

function roleIdOf(row: AdminOrgUser): RoleId | null {
  if (/super admin/i.test(row.role)) return "SUPER_ADMIN";
  if (isViewOnly(row)) return "ENTERPRISE_ADMIN";
  return null;
}

function useOrgSites(orgId: string) {
  return buildSitesDirectory({ ...EMPTY_ADMIN_FILTERS, organisationId: orgId, period: "all" }, EMPTY_ADMIN_SITES_FILTERS)
    .rows.slice()
    .sort((a, b) => a.name.localeCompare(b.name));
}

function reachLabel(row: AdminOrgUser, sites: AdminDirectorySite[]) {
  if (!isViewOnly(row)) return null;
  const ids = row.scopeSiteIds ?? [];
  if (!ids.length) return "All sites";
  const names = ids.map((id) => sites.find((site) => site.id === id)?.name ?? `Site ${id}`);
  return names.length <= 2 ? names.join(", ") : `${names.slice(0, 2).join(", ")} +${names.length - 2} more`;
}

export function AdminOrgUsers({ orgId, orgName, users }: { orgId: string; orgName: string; users: AdminOrgUser[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<AdminOrgUser | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const sites = useOrgSites(orgId);

  const pageCount = Math.max(1, Math.ceil(users.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = users.slice((current - 1) * pageSize, current * pageSize);

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-saveful text-sm text-gray-500">
          Invite a head-office user, or change what someone can see — the whole Enterprise or chosen sites.
        </p>
        <button
          type="button"
          onClick={() => {
            setNotice(null);
            setInviting(true);
          }}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 self-start rounded-lg bg-saveful-green px-3 font-saveful-semibold text-sm text-white hover:bg-saveful-green/90 sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Invite user
        </button>
      </div>

      {notice ? (
        <p
          className={cn(
            "rounded-lg border px-3 py-2 font-saveful text-sm",
            notice.tone === "ok" ? "border-saveful-green/20 bg-saveful-green/5 text-saveful-green" : "border-red-200 bg-red-50 text-red-700",
          )}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="min-w-full text-left">
          <thead>
            <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
              <th className="px-3.5 py-2.5 font-saveful">Name</th>
              <th className="px-3.5 py-2.5 font-saveful">Email</th>
              <th className="px-3.5 py-2.5 font-saveful">Role</th>
              <th className="px-3.5 py-2.5 font-saveful">Status</th>
              <th className="px-3.5 py-2.5 text-right font-saveful">Access</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => {
              const editable = memberId(row) != null;
              const reach = reachLabel(row, sites);
              return (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{row.name}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{row.email}</td>
                  <td className="px-3.5 py-2.5">
                    <p className="font-saveful text-sm text-gray-700">{row.role}</p>
                    {reach ? <p className="max-w-[260px] truncate font-saveful text-xs text-gray-400">Can see: {reach}</p> : null}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {editable ? (
                      <button
                        type="button"
                        onClick={() => {
                          setNotice(null);
                          setEditing(row);
                        }}
                        className="h-8 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful-semibold text-xs text-gray-700 hover:bg-[#EFEDE6]"
                      >
                        Change access
                      </button>
                    ) : (
                      <span className="font-saveful text-xs text-gray-400">Awaiting activation</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">
                  No users.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
        <TablePager
          page={current}
          pageSize={pageSize}
          total={users.length}
          noun="users"
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </div>

      {inviting ? (
        <InviteUserModal
          orgId={orgId}
          orgName={orgName}
          sites={sites}
          onClose={() => setInviting(false)}
          onInvited={(email) => {
            setInviting(false);
            setNotice({ tone: "ok", text: `Invitation sent to ${email}. They will set their own password from the email.` });
            void refreshOrganisationDetail(orgId, { listings: false }).catch(() => undefined);
          }}
        />
      ) : null}

      {editing ? (
        <AccessModal
          orgId={orgId}
          row={editing}
          sites={sites}
          onClose={() => setEditing(null)}
          onSaved={(text) => {
            setEditing(null);
            setNotice({ tone: "ok", text });
            void refreshOrganisationDetail(orgId, { listings: false }).catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}

function AccessModal({
  orgId,
  row,
  sites,
  onClose,
  onSaved,
}: {
  orgId: string;
  row: AdminOrgUser;
  sites: AdminDirectorySite[];
  onClose: () => void;
  onSaved: (text: string) => void;
}) {
  const [role, setRole] = useState<RoleId>(roleIdOf(row) ?? "ENTERPRISE_ADMIN");
  const [siteIds, setSiteIds] = useState<string[]>(row.scopeSiteIds ?? []);
  const [limited, setLimited] = useState((row.scopeSiteIds ?? []).length > 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const userId = memberId(row);
    if (!userId) return;
    const chosen = role === "ENTERPRISE_ADMIN" && limited ? siteIds.map(Number).filter(Number.isFinite) : [];
    if (role === "ENTERPRISE_ADMIN" && limited && !chosen.length) {
      setError("Choose at least one site, or switch to All sites.");
      return;
    }
    setSaving(true);
    setError(null);
    const label = ENTERPRISE_ROLES.find((item) => item.id === role)?.label ?? role;
    setAdminEnterpriseUserRole(orgId, userId, role, chosen)
      .then(() =>
        onSaved(
          role === "ENTERPRISE_ADMIN"
            ? `${row.name} is now ${label} for ${chosen.length ? `${chosen.length} site${chosen.length === 1 ? "" : "s"}` : "all sites"}. They will see the change the next time they sign in.`
            : `${row.name} is now ${label}. They will see the change the next time they sign in.`,
        ),
      )
      .catch((err) => setError(errorText(err, "Could not change the access.")))
      .finally(() => setSaving(false));
  };

  return (
    <Modal title="Change access" subtitle={`${row.name} · ${row.email}`} onClose={onClose} onSubmit={submit}>
      <RolePicker role={role} onRole={setRole} />
      {role === "ENTERPRISE_ADMIN" ? (
        <SiteScopePicker sites={sites} limited={limited} onLimited={setLimited} selected={siteIds} onSelected={setSiteIds} />
      ) : null}
      {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">{error}</p> : null}
      <ModalActions saving={saving} label={saving ? "Saving…" : "Save access"} onClose={onClose} />
    </Modal>
  );
}

function InviteUserModal({
  orgId,
  orgName,
  sites,
  onClose,
  onInvited,
}: {
  orgId: string;
  orgName: string;
  sites: AdminDirectorySite[];
  onClose: () => void;
  onInvited: (email: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<RoleId>("ENTERPRISE_ADMIN");
  const [limited, setLimited] = useState(false);
  const [siteIds, setSiteIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim() || !cleanEmail) {
      setError("First name, last name and email are required.");
      return;
    }
    const chosen = role === "ENTERPRISE_ADMIN" && limited ? siteIds.map(Number).filter(Number.isFinite) : [];
    if (role === "ENTERPRISE_ADMIN" && limited && !chosen.length) {
      setError("Choose at least one site, or switch to All sites.");
      return;
    }
    setSaving(true);
    setError(null);
    inviteAdminEnterpriseUser(orgId, {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: cleanEmail,
      ...(mobile.trim() ? { mobile: mobile.trim() } : {}),
      role,
      ...(chosen.length ? { scopes: chosen.map((scopeId) => ({ scopeType: "SITE", scopeId })) } : {}),
    })
      .then(() => onInvited(cleanEmail))
      .catch((err) => setError(errorText(err, "Could not send the invitation.")))
      .finally(() => setSaving(false));
  };

  return (
    <Modal title="Invite user" subtitle={`${orgName} · they will receive an email to set their own password.`} onClose={onClose} onSubmit={submit}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="First name">
          <input className={INPUT} value={firstName} onChange={(event) => setFirstName(event.target.value)} autoFocus />
        </Field>
        <Field label="Last name">
          <input className={INPUT} value={lastName} onChange={(event) => setLastName(event.target.value)} />
        </Field>
        <Field label="Email" className="sm:col-span-2">
          <input type="email" className={INPUT} value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        <Field label="Mobile (optional)" className="sm:col-span-2">
          <input className={INPUT} value={mobile} onChange={(event) => setMobile(event.target.value)} />
        </Field>
      </div>
      <div className="mt-4">
        <RolePicker role={role} onRole={setRole} />
        <p className="mt-2 font-saveful text-[11px] text-gray-400">Site Admins and Site Users are added from the site itself.</p>
      </div>
      {role === "ENTERPRISE_ADMIN" ? (
        <SiteScopePicker sites={sites} limited={limited} onLimited={setLimited} selected={siteIds} onSelected={setSiteIds} />
      ) : null}
      {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">{error}</p> : null}
      <ModalActions saving={saving} label={saving ? "Sending…" : "Send invitation"} onClose={onClose} />
    </Modal>
  );
}

function RolePicker({ role, onRole }: { role: RoleId; onRole: (role: RoleId) => void }) {
  return (
    <fieldset>
      <legend className="mb-2 font-saveful-semibold text-xs text-gray-600">Role</legend>
      <div className="space-y-2">
        {ENTERPRISE_ROLES.map((item) => (
          <label
            key={item.id}
            className={cn(
              "flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5",
              role === item.id ? "border-saveful-green bg-saveful-green/[0.03]" : "border-gray-200 hover:border-gray-300",
            )}
          >
            <input
              type="radio"
              name="role"
              value={item.id}
              checked={role === item.id}
              onChange={() => onRole(item.id)}
              className="mt-0.5 accent-saveful-green"
            />
            <span>
              <span className="block font-saveful-semibold text-sm text-gray-900">{item.label}</span>
              <span className="block font-saveful text-xs text-gray-500">{item.hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function SiteScopePicker({
  sites,
  limited,
  onLimited,
  selected,
  onSelected,
}: {
  sites: AdminDirectorySite[];
  limited: boolean;
  onLimited: (limited: boolean) => void;
  selected: string[];
  onSelected: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const visible = query
    ? sites.filter((site) => `${site.name} ${site.siteCode} ${site.address}`.toLowerCase().includes(query))
    : sites;
  const toggle = (id: string) => onSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);

  return (
    <fieldset className="mt-4">
      <legend className="mb-2 font-saveful-semibold text-xs text-gray-600">Sites they can see</legend>
      <div className="grid grid-cols-2 gap-2">
        {[
          { value: false, label: "All sites", hint: `Every site (${sites.length}), including new ones` },
          { value: true, label: "Only chosen sites", hint: limited && selected.length ? `${selected.length} selected` : "Pick one or more" },
        ].map((option) => (
          <label
            key={option.label}
            className={cn(
              "flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2",
              limited === option.value ? "border-saveful-green bg-saveful-green/[0.03]" : "border-gray-200 hover:border-gray-300",
            )}
          >
            <input
              type="radio"
              name="site-scope"
              checked={limited === option.value}
              onChange={() => onLimited(option.value)}
              className="mt-0.5 accent-saveful-green"
            />
            <span className="min-w-0">
              <span className="block font-saveful-semibold text-sm text-gray-900">{option.label}</span>
              <span className="block truncate font-saveful text-[11px] text-gray-500">{option.hint}</span>
            </span>
          </label>
        ))}
      </div>

      {limited ? (
        <div className="mt-2 rounded-xl border border-gray-200">
          <div className="border-b border-gray-100 p-2">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search sites"
                className="h-8 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] pl-8 pr-2 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white"
              />
            </label>
          </div>
          <ul className="max-h-52 overflow-y-auto py-1 [scrollbar-width:thin]">
            {visible.map((site) => (
              <li key={site.id}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 hover:bg-[#FAF7F0]">
                  <input
                    type="checkbox"
                    checked={selected.includes(site.id)}
                    onChange={() => toggle(site.id)}
                    className="accent-saveful-green"
                  />
                  <span className="min-w-0">
                    <span className="block truncate font-saveful text-sm text-gray-800">{site.name}</span>
                    <span className="block truncate font-saveful text-[11px] text-gray-400">
                      {[site.siteCode, site.address].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
            {visible.length === 0 ? <li className="px-3 py-4 text-center font-saveful text-sm text-gray-400">No sites match.</li> : null}
          </ul>
          <div className="flex items-center justify-between border-t border-gray-100 px-3 py-1.5 font-saveful text-[11px] text-gray-500">
            <span>
              {selected.length} of {sites.length} selected
            </span>
            {selected.length ? (
              <button type="button" onClick={() => onSelected([])} className="font-saveful-semibold text-saveful-green hover:underline">
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </fieldset>
  );
}

function Modal({
  title,
  subtitle,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  onSubmit: (event: FormEvent) => void;
  children: ReactNode;
}) {
  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={onSubmit}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white px-5 pb-5 pt-4 shadow-2xl sm:rounded-2xl sm:px-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-saveful-bold text-lg text-gray-900">{title}</h2>
            <p className="mt-0.5 truncate font-saveful text-xs text-gray-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#F1F0EC] text-gray-600 hover:bg-[#E7E5DF]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </form>
    </div>,
    document.body,
  );
}

function ModalActions({ saving, label, onClose }: { saving: boolean; label: string; onClose: () => void }) {
  return (
    <div className="mt-5 flex justify-end gap-2">
      <button
        type="button"
        onClick={onClose}
        className="h-9 rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-700 hover:bg-[#F7F6F2]"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saving}
        className="h-9 rounded-lg bg-saveful-green px-4 font-saveful-semibold text-sm text-white hover:bg-saveful-green/90 disabled:opacity-60"
      >
        {label}
      </button>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block font-saveful-semibold text-xs text-gray-600">{label}</span>
      {children}
    </label>
  );
}
