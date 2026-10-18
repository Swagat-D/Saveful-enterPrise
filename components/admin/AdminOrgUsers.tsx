"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { UserPlus, X } from "lucide-react";
import { StatusPill, TablePager, type PageSize } from "@/components/admin/AdminChrome";
import { inviteAdminEnterpriseUser, setAdminEnterpriseUserRole } from "@/lib/api";
import { refreshOrganisationDetail, type AdminOrgUser } from "@/lib/admin";
import { cn } from "@/lib/utils";

const ENTERPRISE_ROLES = [
  {
    id: "ENTERPRISE_ADMIN",
    label: "Enterprise Admin (View only)",
    hint: "Sees every site, the dashboard, insights and reports. Cannot add, edit or change anything.",
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

export function AdminOrgUsers({ orgId, orgName, users }: { orgId: string; orgName: string; users: AdminOrgUser[] }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [inviting, setInviting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const pageCount = Math.max(1, Math.ceil(users.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = users.slice((current - 1) * pageSize, current * pageSize);

  const changeRole = (row: AdminOrgUser, role: RoleId) => {
    const userId = memberId(row);
    const target = ENTERPRISE_ROLES.find((item) => item.id === role);
    if (!userId || !target || row.role === target.label) return;
    const ok = window.confirm(
      `Change ${row.name} from ${row.role} to ${target.label}?\n\n${target.hint}\n\nThey will see the change the next time they sign in.`,
    );
    if (!ok) return;
    setBusyId(row.id);
    setNotice(null);
    setAdminEnterpriseUserRole(orgId, userId, role)
      .then(() => refreshOrganisationDetail(orgId, { listings: false }))
      .then(() => setNotice({ tone: "ok", text: `${row.name} is now ${target.label}.` }))
      .catch((err) => setNotice({ tone: "error", text: errorText(err, "Could not change the role.") }))
      .finally(() => setBusyId(null));
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-saveful text-sm text-gray-500">
          Invite a head-office user, or change someone&apos;s access to the whole Enterprise.
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
              return (
                <tr key={row.id} className="border-b border-gray-50 last:border-0">
                  <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{row.name}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{row.email}</td>
                  <td className="px-3.5 py-2.5 font-saveful text-sm text-gray-700">{row.role}</td>
                  <td className="px-3.5 py-2.5">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    {editable ? (
                      <select
                        aria-label={`Change access for ${row.name}`}
                        value=""
                        disabled={busyId === row.id}
                        onChange={(event) => changeRole(row, event.target.value as RoleId)}
                        className="h-8 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2 font-saveful text-xs text-gray-700 outline-none disabled:opacity-50"
                      >
                        <option value="">{busyId === row.id ? "Saving…" : "Change access"}</option>
                        {ENTERPRISE_ROLES.filter((item) => item.label !== row.role).map((item) => (
                          <option key={item.id} value={item.id}>
                            Make {item.label}
                          </option>
                        ))}
                      </select>
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
          onClose={() => setInviting(false)}
          onInvited={(email) => {
            setInviting(false);
            setNotice({ tone: "ok", text: `Invitation sent to ${email}. They will set their own password from the email.` });
            void refreshOrganisationDetail(orgId, { listings: false }).catch(() => undefined);
          }}
        />
      ) : null}
    </div>
  );
}

function InviteUserModal({
  orgId,
  orgName,
  onClose,
  onInvited,
}: {
  orgId: string;
  orgName: string;
  onClose: () => void;
  onInvited: (email: string) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [role, setRole] = useState<RoleId>("ENTERPRISE_ADMIN");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!firstName.trim() || !lastName.trim() || !cleanEmail) {
      setError("First name, last name and email are required.");
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
    })
      .then(() => onInvited(cleanEmail))
      .catch((err) => setError(errorText(err, "Could not send the invitation.")))
      .finally(() => setSaving(false));
  };

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        onSubmit={submit}
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white px-5 pb-5 pt-4 shadow-2xl sm:rounded-2xl sm:px-6"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-saveful-bold text-lg text-gray-900">Invite user</h2>
            <p className="mt-0.5 font-saveful text-xs text-gray-500">
              {orgName} · they will receive an email to set their own password.
            </p>
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

        <fieldset className="mt-4">
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
                  onChange={() => setRole(item.id)}
                  className="mt-0.5 accent-saveful-green"
                />
                <span>
                  <span className="block font-saveful-semibold text-sm text-gray-900">{item.label}</span>
                  <span className="block font-saveful text-xs text-gray-500">{item.hint}</span>
                </span>
              </label>
            ))}
          </div>
          <p className="mt-2 font-saveful text-[11px] text-gray-400">Site Admins and Site Users are added from the site itself.</p>
        </fieldset>

        {error ? <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">{error}</p> : null}

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
            {saving ? "Sending…" : "Send invitation"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
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
