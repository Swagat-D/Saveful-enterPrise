"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { getOrganisationSiteDetails, type ApiSiteRow } from "@/lib/api";
import { demoSites } from "@/lib/demo";
import {
  formatScope,
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
}): DirectoryUser {
  const names = splitName(input.name);
  return {
    id: input.id,
    firstName: names.first,
    lastName: names.last,
    name: input.name.trim() || input.email,
    email: input.email,
    mobile: input.mobile ?? "",
    role: "site_admin",
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
  contact?: { name: string; email: string; mobile?: string; userId?: string | null },
) {
  const rows = [...fromDirectory];
  const seen = new Set(rows.map((user) => user.email.trim().toLowerCase()).filter(Boolean));
  const seenIds = new Set(rows.map((user) => user.id));

  for (const manager of managers) {
    const email = manager.user?.email?.trim() ?? "";
    const key = email.toLowerCase();
    const id = String(manager.userId);
    if ((key && seen.has(key)) || seenIds.has(id)) continue;
    const name = `${manager.user?.firstName ?? ""} ${manager.user?.lastName ?? ""}`.trim() || email || "Site Admin";
    rows.push(
      directoryUserFromContact({
        id,
        name,
        email,
        mobile: manager.user?.phoneNumber,
        siteId,
        status: "active",
      }),
    );
    if (key) seen.add(key);
    seenIds.add(id);
  }

  const contactKey = contact?.email.trim().toLowerCase() ?? "";
  if ((contact?.email || contact?.name) && !(contactKey && seen.has(contactKey))) {
    const id = contact?.userId && !seenIds.has(contact.userId) ? contact.userId : `contact-${siteId}`;
    rows.unshift(
      directoryUserFromContact({
        id,
        name: contact?.name || contact?.email || "Site Admin",
        email: contact?.email ?? "",
        mobile: contact?.mobile,
        siteId,
      }),
    );
  }

  return rows;
}

export function UsersDirectory({
  siteId,
  canInvite,
  compact,
}: {
  siteId?: string;
  siteName?: string;
  canInvite?: boolean;
  compact?: boolean;
}) {
  useUsersVersion();
  const site = siteId ? demoSites.find((item) => item.id === siteId) : undefined;
  const [managers, setManagers] = useState<NonNullable<ApiSiteRow["managers"]>>([]);

  useEffect(() => {
    if (!siteId || !/^\d+$/.test(siteId)) return;
    let cancelled = false;
    getOrganisationSiteDetails(Number(siteId))
      .then((detail) => {
        if (!cancelled) setManagers(detail.managers ?? detail.site.managers ?? []);
      })
      .catch(() => {
        if (!cancelled) setManagers([]);
      });
    return () => {
      cancelled = true;
    };
  }, [siteId]);

  const rows = useMemo(() => {
    if (!site) return listUsers();
    return mergeSitePeople(site.id, usersForSite(site), managers, {
      name: site.managerName || site.primaryContact || "",
      email: site.email,
      mobile: site.mobile,
      userId: site.managerUserId,
    });
  }, [managers, site]);
  const invited = rows.filter((user) => user.status === "invited").length;
  const active = rows.filter((user) => user.status === "active").length;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-100">
        <CompactStat label="People" value={String(rows.length)} />
        <CompactStat label="Active" value={String(active)} muted />
        <CompactStat label="Invited" value={String(invited)} />
      </div>

      <div className={siteId ? "grid gap-5 lg:grid-cols-5" : ""}>
        <div className={siteId ? "lg:col-span-3" : undefined}>
          <p className="mb-2 font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-400">Directory</p>
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

        {siteId && canInvite ? (
          <div className="lg:col-span-2">
            <p className="mb-2 font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-400">Invite</p>
            <p className="mb-3 font-saveful text-xs text-gray-500">
              Role is what they can do. Scope is what they can access. Invitations are managed in Users & Access.
            </p>
            <Link
              href={`/users/new?site=${siteId}`}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
            >
              <Plus className="h-3.5 w-3.5" />
              Add user
            </Link>
          </div>
        ) : null}
      </div>
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
