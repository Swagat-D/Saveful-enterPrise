"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MoreHorizontal, Plus, Search } from "lucide-react";
import { MoreFilters } from "@/components/network/FilterBar";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { useSession } from "@/lib/auth";
import { userPermissions } from "@/lib/permissions";
import {
  EMPTY_USER_FILTERS,
  ENTERPRISE_ROLES,
  SCOPE_FILTERS,
  avatarColor,
  filterUsers,
  formatScope,
  hasActiveUserFilters,
  lastSeenLabel,
  parseUserFilters,
  resendInvitation,
  roleLabel,
  setUserStatus,
  statusLabel,
  userFiltersToQuery,
  userInitials,
  userSummaryCounts,
  useUsersVersion,
  type UsersTableFilters,
} from "@/lib/users";
import type { DirectoryUser, DirectoryUserStatus } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40";

export function UsersAccess() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSession();
  const permissions = userPermissions(user);
  const version = useUsersVersion();
  const filters = useMemo(() => parseUserFilters(searchParams), [searchParams]);
  const counts = useMemo(() => userSummaryCounts(), [version]);
  const rows = useMemo(() => filterUsers(filters), [filters, version]);
  const pageCount = Math.max(1, Math.ceil(rows.length / filters.pageSize));
  const page = Math.min(filters.page, pageCount);
  const paged = rows.slice((page - 1) * filters.pageSize, page * filters.pageSize);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const setFilters = (next: UsersTableFilters) => {
    router.replace(`${pathname}${userFiltersToQuery({ ...next, page: next.page || 1 })}`, { scroll: false });
  };

  const update = (patch: Partial<UsersTableFilters>) => {
    setFilters({ ...filters, ...patch, page: patch.page ?? 1 });
  };

  const toggleSummary = (key: DirectoryUserStatus) => {
    update({ summary: filters.summary === key ? "all" : key, status: "all" });
  };

  const filterCount = [filters.role !== "all", filters.scope !== "all", filters.status !== "all"].filter(Boolean).length;

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <span className="text-gray-400">Users</span>
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">Users & Access</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">Users & Access</h1>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                Manage who can access your Enterprise and what they can see or do.
              </p>
            </div>
            {permissions.add ? (
              <Link
                href="/users/new"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                Add user
              </Link>
            ) : null}
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            {notice ? <p className="font-saveful text-sm text-saveful-green">{notice}</p> : null}

            <WorkspaceSection title="Access snapshot">
              <div className="grid grid-cols-2 gap-px bg-gray-100 sm:grid-cols-4">
                <SummaryCell
                  label="Total users"
                  value={counts.total}
                  active={filters.summary === "total" || filters.summary === "all"}
                  onClick={() => update({ summary: "all", status: "all" })}
                />
                <SummaryCell
                  label="Active"
                  value={counts.active}
                  active={filters.summary === "active"}
                  onClick={() => toggleSummary("active")}
                />
                <SummaryCell
                  label="Invited"
                  value={counts.invited}
                  active={filters.summary === "invited"}
                  onClick={() => toggleSummary("invited")}
                />
                <SummaryCell
                  label="Deactivated"
                  value={counts.deactivated}
                  active={filters.summary === "deactivated"}
                  onClick={() => toggleSummary("deactivated")}
                />
              </div>
            </WorkspaceSection>

            <WorkspaceSection
              title="Directory"
              action={
                hasActiveUserFilters(filters) ? (
                  <button
                    type="button"
                    onClick={() => setFilters({ ...EMPTY_USER_FILTERS })}
                    className="font-saveful-semibold text-xs text-saveful-green hover:underline"
                  >
                    Clear filters
                  </button>
                ) : null
              }
            >
              <div className="space-y-3 p-3.5">
                <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                  <label className="relative min-w-0 flex-1">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                    <input
                      value={filters.q}
                      onChange={(event) => update({ q: event.target.value })}
                      placeholder="Search by name or email"
                      className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] pl-8 pr-3 font-saveful text-sm outline-none focus:border-saveful-green/40 focus:bg-white"
                    />
                  </label>
                  <div className="lg:hidden">
                    <MoreFilters
                      count={filterCount}
                      summary={[
                        filters.role !== "all" ? roleLabel(filters.role) : "",
                        filters.scope !== "all" ? SCOPE_FILTERS.find((item) => item.id === filters.scope)?.name : "",
                        filters.status !== "all" ? statusLabel(filters.status) : "",
                      ]
                        .filter(Boolean)
                        .join(" · ") || "All users"}
                      title="Filter users"
                      subtitle="Role is what they can do. Scope is what they can access."
                      onReset={() => setFilters({ ...filters, role: "all", scope: "all", status: "all", page: 1 })}
                    >
                      <div className="grid grid-cols-1 gap-3">
                        <FilterSelect
                          label="Role"
                          value={filters.role}
                          onChange={(role) => update({ role: role as UsersTableFilters["role"] })}
                          options={[{ id: "all", name: "All" }, ...ENTERPRISE_ROLES.map((role) => ({ id: role.id, name: role.label }))]}
                        />
                        <FilterSelect
                          label="Scope"
                          value={filters.scope}
                          onChange={(scope) => update({ scope: scope as UsersTableFilters["scope"] })}
                          options={SCOPE_FILTERS.map((item) => ({ id: item.id, name: item.id === "all" ? "All" : item.name }))}
                        />
                        <FilterSelect
                          label="Status"
                          value={filters.status}
                          onChange={(status) => update({ status: status as UsersTableFilters["status"], summary: "all" })}
                          options={[
                            { id: "all", name: "All" },
                            { id: "active", name: "Active" },
                            { id: "invited", name: "Invited" },
                            { id: "deactivated", name: "Deactivated" },
                          ]}
                        />
                      </div>
                    </MoreFilters>
                  </div>
                  <div className="hidden grid-cols-3 gap-2 lg:grid lg:w-auto">
                    <FilterSelect
                      value={filters.role}
                      onChange={(role) => update({ role: role as UsersTableFilters["role"] })}
                      options={[{ id: "all", name: "Role: All" }, ...ENTERPRISE_ROLES.map((role) => ({ id: role.id, name: `Role: ${role.label}` }))]}
                    />
                    <FilterSelect
                      value={filters.scope}
                      onChange={(scope) => update({ scope: scope as UsersTableFilters["scope"] })}
                      options={[...SCOPE_FILTERS]}
                    />
                    <FilterSelect
                      value={filters.status}
                      onChange={(status) => update({ status: status as UsersTableFilters["status"], summary: "all" })}
                      options={[
                        { id: "all", name: "Status: All" },
                        { id: "active", name: "Status: Active" },
                        { id: "invited", name: "Status: Invited" },
                        { id: "deactivated", name: "Status: Deactivated" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              <div className="hidden overflow-x-auto px-3.5 pb-2 lg:block">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="pb-2 pr-3 font-saveful">User</th>
                      <th className="pb-2 pr-3 font-saveful">Role</th>
                      <th className="pb-2 pr-3 font-saveful">Scope</th>
                      <th className="pb-2 pr-3 font-saveful">Status</th>
                      <th className="pb-2 pr-3 font-saveful">Last active</th>
                      <th className="pb-2 font-saveful"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {paged.map((person) => (
                      <tr
                        key={person.id}
                        className="cursor-pointer border-b border-gray-50 last:border-0 hover:bg-[#FAF7F0]"
                        onClick={() => router.push(`/users/${person.id}`)}
                      >
                        <td className="py-2.5 pr-3">
                          <UserCell user={person} />
                        </td>
                        <td className="py-2.5 pr-3">
                          <p className="font-saveful-semibold text-sm text-gray-900">{roleLabel(person.role)}</p>
                          <p className="font-saveful text-[11px] text-gray-400">What they can do</p>
                        </td>
                        <td className="max-w-[16rem] py-2.5 pr-3">
                          <p className="font-saveful text-sm text-gray-800">{formatScope(person.scope)}</p>
                          <p className="font-saveful text-[11px] text-gray-400">What they can access</p>
                        </td>
                        <td className="py-2.5 pr-3">
                          <StatusPill status={person.status} />
                        </td>
                        <td className="py-2.5 pr-3 font-saveful text-sm text-gray-600">{lastSeenLabel(person)}</td>
                        <td className="py-2.5" onClick={(event) => event.stopPropagation()}>
                          <RowMenu
                            user={person}
                            open={menuId === person.id}
                            permissions={permissions}
                            onToggle={() => setMenuId((current) => (current === person.id ? null : person.id))}
                            onResend={() => {
                              const result = resendInvitation(person.id);
                              setMenuId(null);
                              setNotice(result.ok ? `Invitation resent to ${person.email}. The previous link no longer works.` : result.error);
                            }}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="divide-y divide-gray-100 px-3.5 lg:hidden">
                {paged.map((person) => (
                  <article key={person.id} className="py-2.5">
                    <Link href={`/users/${person.id}`} className="block">
                      <div className="flex items-start justify-between gap-3">
                        <UserCell user={person} />
                        <StatusPill status={person.status} />
                      </div>
                      <p className="mt-1.5 font-saveful text-xs text-gray-500">
                        {roleLabel(person.role)} · {formatScope(person.scope)}
                      </p>
                      <p className="mt-0.5 font-saveful text-xs text-gray-500">{lastSeenLabel(person)}</p>
                    </Link>
                    <div className="mt-2">
                      <RowMenu
                        user={person}
                        open={menuId === person.id}
                        permissions={permissions}
                        onToggle={() => setMenuId((current) => (current === person.id ? null : person.id))}
                        onResend={() => {
                          const result = resendInvitation(person.id);
                          setMenuId(null);
                          setNotice(result.ok ? `Invitation resent to ${person.email}. The previous link no longer works.` : result.error);
                        }}
                      />
                    </div>
                  </article>
                ))}
              </div>

              {rows.length === 0 ? (
                <p className="px-3.5 pb-3.5 font-saveful text-sm text-gray-500">No users match these filters.</p>
              ) : (
                <div className="flex flex-col gap-3 border-t border-gray-100 px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-saveful text-xs text-gray-500">
                    Showing {(page - 1) * filters.pageSize + 1}–{Math.min(page * filters.pageSize, rows.length)} of {rows.length} users
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <label className="flex items-center gap-2 font-saveful text-xs text-gray-500">
                      Rows per page
                      <select
                        value={filters.pageSize}
                        onChange={(event) => update({ pageSize: Number(event.target.value) as 10 | 25 | 50, page: 1 })}
                        className="h-8 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                      </select>
                    </label>
                    <div className="flex items-center gap-1">
                      <PageButton disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
                        ‹
                      </PageButton>
                      <span className="min-w-8 px-2 text-center font-saveful text-sm">{page}</span>
                      <PageButton disabled={page >= pageCount} onClick={() => update({ page: page + 1 })}>
                        ›
                      </PageButton>
                    </div>
                  </div>
                </div>
              )}
            </WorkspaceSection>
          </div>
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}

function UserCell({ user }: { user: DirectoryUser }) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-saveful-semibold text-[11px] text-white"
        style={{ background: avatarColor(user.name) }}
      >
        {userInitials(user.name)}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-saveful-semibold text-sm text-gray-900">{user.name}</span>
        <span className="block truncate font-saveful text-xs text-gray-500">{user.email}</span>
      </span>
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

function RowMenu({
  user,
  open,
  permissions,
  onToggle,
  onResend,
}: {
  user: DirectoryUser;
  open: boolean;
  permissions: ReturnType<typeof userPermissions>;
  onToggle: () => void;
  onResend: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-8 w-8 items-center justify-center rounded-lg border border-black/[0.06] text-gray-600 hover:bg-[#F7F6F2]"
        aria-label={`${user.name} actions`}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-lg">
          <Link href={`/users/${user.id}`} className="block px-3 py-2 font-saveful text-sm hover:bg-[#F7F6F2]">
            View / Edit
          </Link>
          {permissions.resend && user.status === "invited" ? (
            <button type="button" className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]" onClick={onResend}>
              Resend invitation
            </button>
          ) : null}
          {permissions.deactivate && user.status === "active" ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
              onClick={() => {
                setUserStatus(user.id, "deactivated");
                onToggle();
              }}
            >
              Deactivate
            </button>
          ) : null}
          {permissions.deactivate && user.status === "deactivated" ? (
            <button
              type="button"
              className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
              onClick={() => {
                setUserStatus(user.id, "active");
                onToggle();
              }}
            >
              Reactivate
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function WorkspaceSection({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <div className="flex items-center gap-2">
          <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
          <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function SummaryCell({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: number;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("bg-white px-3 py-3 text-left transition hover:bg-[#FAF7F0]", active && "bg-saveful-green/[0.04]")}
    >
      <p className="font-saveful-bold text-[1.05rem] tabular-nums leading-none text-gray-900">{value}</p>
      <p className="mt-1.5 font-saveful text-[11px] text-gray-500">{label}</p>
    </button>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <label className="block min-w-0">
      {label ? (
        <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">{label}</span>
      ) : null}
      <div className="relative">
        <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
          {options.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </span>
      </div>
    </label>
  );
}

function PageButton({ children, disabled, onClick }: { children: string; disabled?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-lg font-saveful text-sm text-gray-700 hover:bg-[#F7F6F2] disabled:opacity-40"
    >
      {children}
    </button>
  );
}
