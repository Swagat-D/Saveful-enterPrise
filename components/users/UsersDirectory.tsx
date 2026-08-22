"use client";

import { UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalPanel, PortalStatCard, StatusBadge } from "@/components/ui/Portal";
import { demoUsers } from "@/lib/demo";
import { usersForSite } from "@/lib/siteWorkspace";
import { cn } from "@/lib/utils";

export function UsersDirectory({
  siteId,
  siteName,
  canInvite,
  compact,
}: {
  siteId?: string;
  siteName?: string;
  canInvite?: boolean;
  compact?: boolean;
}) {
  const rows = siteId && siteName ? usersForSite(siteId, siteName) : demoUsers;
  const invited = rows.filter((user) => user.status === "Invited").length;

  return (
    <div className={compact ? "space-y-4" : "space-y-4"}>
      {compact ? (
        <div className="grid grid-cols-3 overflow-hidden rounded-xl border border-gray-100">
          <CompactStat label="People" value={String(rows.length)} />
          <CompactStat label="Active" value={String(rows.length - invited)} muted />
          <CompactStat label="Invited" value={String(invited)} />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <PortalStatCard
            label="People"
            value={String(rows.length)}
            hint={siteName ? `With access to ${siteName}` : "Across all sites"}
            icon={Users}
          />
          <PortalStatCard
            label="Active"
            value={String(rows.length - invited)}
            hint="Signed in at least once"
            icon={Users}
            accent="teal"
          />
          <PortalStatCard
            label="Invited"
            value={String(invited)}
            hint="Waiting to accept"
            icon={UserPlus}
            accent="amber"
          />
        </div>
      )}

      <div className={siteId ? "grid gap-5 lg:grid-cols-5" : ""}>
        {compact ? (
          <div className={siteId ? "lg:col-span-3" : undefined}>
            <p className="mb-2 font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-400">Directory</p>
            <UserTable rows={rows} hideSite={Boolean(siteId)} compact />
          </div>
        ) : (
        <PortalPanel
          title="Directory"
          subtitle={siteName ? `Role and access for ${siteName}` : "Role and site assignment"}
          className={siteId ? "lg:col-span-3" : undefined}
        >
          <UserTable rows={rows} hideSite={Boolean(siteId)} />
        </PortalPanel>
        )}

        {siteId && canInvite ? (
          compact ? (
            <div className="lg:col-span-2">
              <p className="mb-2 font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-400">Invite</p>
              <InviteForm />
            </div>
          ) : (
          <PortalPanel title="Invite to this site" subtitle="They only get this location" className="lg:col-span-2">
            <InviteForm />
          </PortalPanel>
          )
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

function InviteForm() {
  return (
    <form className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="invite-name">Name</Label>
        <Input id="invite-name" placeholder="Priya Nair" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-email">Email</Label>
        <Input id="invite-email" type="email" placeholder="manager@yourbusiness.com" />
      </div>
      <Button type="button" className="w-full">
        <UserPlus className="h-4 w-4" />
        Send invite
      </Button>
    </form>
  );
}

function UserTable({
  rows,
  hideSite,
  compact,
}: {
  rows: typeof demoUsers;
  hideSite?: boolean;
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
            <th className="pb-2 pr-4 font-saveful">Name</th>
            <th className="pb-2 pr-4 font-saveful">Role</th>
            {hideSite ? null : <th className="pb-2 pr-4 font-saveful">Site</th>}
            <th className="pb-2 font-saveful">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((user) => (
            <tr key={user.id} className="border-b border-gray-50 last:border-0">
              <td className={cn("pr-4", compact ? "py-2" : "py-3")}>
                <p className="font-saveful-semibold text-sm text-gray-900">{user.name}</p>
                <p className="font-saveful text-xs text-gray-500">{user.email}</p>
              </td>
              <td className={cn("pr-4 font-saveful text-sm text-gray-700", compact ? "py-2" : "py-3")}>{user.role}</td>
              {hideSite ? null : (
                <td className={cn("pr-4 font-saveful text-sm text-gray-700", compact ? "py-2" : "py-3")}>{user.site}</td>
              )}
              <td className={compact ? "py-2" : "py-3"}>
                <StatusBadge tone={user.status === "Active" ? "green" : "amber"}>{user.status}</StatusBadge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
