"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import { getOrganisationSiteDetails, type ApiSiteRow } from "@/lib/api";
import { demoSites } from "@/lib/demo";
import {
  formatScope,
  inviteSiteMember,
  lastSeenLabel,
  listUsers,
  roleLabel,
  statusLabel,
  useUsersVersion,
  usersForSite,
} from "@/lib/users";
import type { DirectoryUser } from "@/types/enterprise";
import { cn } from "@/lib/utils";

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { first: "", last: "" };
  if (parts.length === 1) return { first: parts[0], last: "" };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function directoryUserFromContact(input: {
  id: string;
  name: string;
  email: string;
  mobile?: string;
  siteId: string;
  status?: DirectoryUser["status"];
  role?: DirectoryUser["role"];
}): DirectoryUser {
  const names = splitName(input.name);
  return {
    id: input.id,
    firstName: names.first,
    lastName: names.last,
    name: input.name.trim() || input.email,
    email: input.email,
    mobile: input.mobile ?? "",
    role: input.role ?? "site_admin",
    scope: { siteIds: [input.siteId] },
    status: input.status ?? "active",
    lastActiveAt: null,
    invitedAt: null,
    inviteToken: null,
  };
}

function mergeSitePeople(
  siteId: string,
  fromDirectory: DirectoryUser[],
  managers: NonNullable<ApiSiteRow["managers"]>,
  staff: NonNullable<ApiSiteRow["managers"]>,
) {
  const rows = [...fromDirectory];
  const seen = new Set(rows.map((user) => user.email.trim().toLowerCase()).filter(Boolean));
  const seenIds = new Set(rows.map((user) => user.id));
  const known = listUsers();

  for (const manager of managers) {
    const email = manager.user?.email?.trim() ?? "";
    const key = email.toLowerCase();
    const id = String(manager.userId);
    if ((key && seen.has(key)) || seenIds.has(id)) continue;
    const name = `${manager.user?.firstName ?? ""} ${manager.user?.lastName ?? ""}`.trim() || email || "Site Admin";
    const existing = known.find((user) => user.id === id || user.email.trim().toLowerCase() === key);
    rows.push(
      directoryUserFromContact({
        id,
        name,
        email,
        mobile: manager.user?.phoneNumber,
        siteId,
        status: "active",
        role: existing?.role ?? "site_admin",
      }),
    );
    if (key) seen.add(key);
    seenIds.add(id);
  }

  for (const member of staff) {
    const email = member.user?.email?.trim() ?? "";
    const key = email.toLowerCase();
    const id = String(member.userId);
    if ((key && seen.has(key)) || seenIds.has(id)) continue;
    const name = `${member.user?.firstName ?? ""} ${member.user?.lastName ?? ""}`.trim() || email || "Site User";
    rows.push(
      directoryUserFromContact({
        id,
        name,
        email,
        mobile: member.user?.phoneNumber,
        siteId,
        status: "active",
        role: "site_user",
      }),
    );
    if (key) seen.add(key);
    seenIds.add(id);
  }

  return rows;
}

export function UsersDirectory({
  siteId,
  canInvite,
  canAddSiteUser,
  compact,
}: {
  siteId?: string;
  siteName?: string;
  canInvite?: boolean;
  canAddSiteUser?: boolean;
  compact?: boolean;
}) {
  useUsersVersion();
  const site = siteId ? demoSites.find((item) => item.id === siteId) : undefined;
  const [managers, setManagers] = useState<NonNullable<ApiSiteRow["managers"]>>([]);
  const [staff, setStaff] = useState<NonNullable<ApiSiteRow["managers"]>>([]);

  useEffect(() => {
    if (!siteId || !/^\d+$/.test(siteId)) return;
    let cancelled = false;
    getOrganisationSiteDetails(Number(siteId))
      .then((detail) => {
        if (cancelled) return;
        setManagers(detail.managers ?? detail.site.managers ?? []);
        setStaff(detail.staff ?? []);
      })
      .catch(() => {
        if (cancelled) return;
        setManagers([]);
        setStaff([]);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const rows = useMemo(() => {
    const directory = listUsers().filter((user) => {
      if (user.role === "enterprise_super_admin" || user.role === "enterprise_admin") return true;
      if (site && usersForSite(site).some((row) => row.id === user.id)) return true;
      return Boolean(siteId && user.scope.siteIds?.includes(siteId));
    });
    return mergeSitePeople(siteId ?? site?.id ?? "", directory, managers, staff);
  }, [managers, site, siteId, staff]);
  const invited = rows.filter((user) => user.status === "invited").length;
  const active = rows.filter((user) => user.status === "active").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-100">
        <CompactStat label="People" value={String(rows.length)} />
        <CompactStat label="Active" value={String(active)} muted />
        <CompactStat label="Invited" value={String(invited)} />
      </div>

      <div>
        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-400">Directory</p>
            {siteId && canAddSiteUser ? <SiteUserInvite siteId={siteId} /> : null}
            {siteId && canInvite && !canAddSiteUser ? (
              <Link
                href={`/users/new?site=${siteId}`}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Add user
              </Link>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="pb-2 pr-4 font-saveful">User</th>
                  <th className="pb-2 pr-4 font-saveful">Role</th>
                  <th className="pb-2 pr-4 font-saveful">Scope</th>
                  <th className="pb-2 font-saveful">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-4 font-saveful text-sm text-gray-500">
                      No users are assigned to this site yet.
                    </td>
                  </tr>
                ) : (
                  rows.map((user) => (
                  <tr key={user.id} className="border-b border-gray-50 last:border-0">
                    <td className={cn("pr-4", compact ? "py-2" : "py-3")}>
                      {user.id.startsWith("contact-") || user.id.startsWith("invite-") ? (
                        <div>
                          <p className="font-saveful-semibold text-sm text-gray-900">{user.name}</p>
                          <p className="font-saveful text-xs text-gray-500">{user.email}</p>
                        </div>
                      ) : (
                        <Link href={`/users/${user.id}`} className="hover:text-saveful-green">
                          <p className="font-saveful-semibold text-sm text-gray-900">{user.name}</p>
                          <p className="font-saveful text-xs text-gray-500">{user.email}</p>
                        </Link>
                      )}
                    </td>
                    <td className={cn("pr-4 font-saveful text-sm text-gray-700", compact ? "py-2" : "py-3")}>
                      {roleLabel(user.role)}
                    </td>
                    <td className={cn("pr-4 font-saveful text-sm text-gray-600", compact ? "py-2" : "py-3")}>
                      {formatScope(user.scope)}
                    </td>
                    <td className={compact ? "py-2" : "py-3"}>
                      <p className="font-saveful text-sm text-gray-800">{statusLabel(user.status)}</p>
                      <p className="font-saveful text-[11px] text-gray-400">{lastSeenLabel(user)}</p>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function SiteUserInvite({ siteId }: { siteId: string }) {
  const [open, setOpen] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");
    setNotice("");
    setSaving(true);
    const result = await inviteSiteMember(siteId, { firstName, lastName, email, mobile });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFirstName("");
    setLastName("");
    setEmail("");
    setMobile("");
    setOpen(false);
    setNotice("Invitation sent. They will set their own password.");
  };

  const dialog = open ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/45 p-4" onClick={() => { if (!saving) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="site-user-invite-title" className="w-full max-w-md rounded-2xl border border-black/[0.05] bg-white p-5 shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-1 flex items-start justify-between gap-3">
              <h2 id="site-user-invite-title" className="font-saveful-bold text-lg text-gray-900">Add site user</h2>
              <button type="button" onClick={() => setOpen(false)} disabled={saving} className="rounded-lg p-1 text-gray-400 hover:bg-[#F7F6F2] hover:text-gray-700" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mb-4 font-saveful text-sm text-gray-500">They join this site only, not as a site admin. An activation link is emailed so they set their own password.</p>
            <div className="space-y-3">
              <label className="block">
                <span className="mb-1 block font-saveful text-xs text-gray-500">First name</span>
                <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className="h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white" />
              </label>
              <label className="block">
                <span className="mb-1 block font-saveful text-xs text-gray-500">Last name</span>
                <input value={lastName} onChange={(event) => setLastName(event.target.value)} className="h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white" />
              </label>
              <label className="block">
                <span className="mb-1 block font-saveful text-xs text-gray-500">Email</span>
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" className="h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white" />
              </label>
              <label className="block">
                <span className="mb-1 block font-saveful text-xs text-gray-500">Mobile (optional)</span>
                <input value={mobile} onChange={(event) => setMobile(event.target.value)} className="h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white" />
              </label>
              {error ? <p className="font-saveful text-sm text-red-600">{error}</p> : null}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setOpen(false)} disabled={saving} className="h-10 rounded-lg px-3 font-saveful text-sm text-gray-600">Cancel</button>
                <button type="button" disabled={saving} onClick={() => void submit()} className="h-10 rounded-lg bg-saveful-green px-4 font-saveful-semibold text-sm text-white disabled:opacity-60">{saving ? "Sending…" : "Send invitation"}</button>
              </div>
            </div>
          </div>
        </div>
  ) : null;

  return (
    <div className="flex items-center gap-3">
      {notice ? <p className="font-saveful text-xs text-saveful-green">{notice}</p> : null}
      <button
        type="button"
        onClick={() => { setError(""); setOpen(true); }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
      >
        <Plus className="h-3.5 w-3.5" />
        Add user
      </button>
      {dialog && typeof document !== "undefined" ? createPortal(dialog, document.body) : null}
    </div>
  );
}

function CompactStat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className={cn("px-3 py-2.5", muted && "bg-[#FAF9F6]")}>
      <p className="font-saveful-bold text-lg tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1 font-saveful text-[11px] text-gray-500">{label}</p>
    </div>
  );
}
