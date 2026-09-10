"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AdminPage, AdminSection, StatusPill, TablePager, useAdminFilters, type PageSize } from "@/components/admin/AdminChrome";
import { listAdminAppUsers, type AdminAppUser, type AppUserKind } from "@/lib/api";
import { formatDisplayDate } from "@/lib/dates";
import { formatLastActivity } from "@/lib/networkRules";
import { cn } from "@/lib/utils";

const KINDS: { id: AppUserKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "business_single", label: "Restaurant single" },
  { id: "business_multi", label: "Restaurant multi" },
  { id: "charity_single", label: "Charity single" },
  { id: "charity_multi", label: "Charity multi" },
  { id: "farmer_producer", label: "Farmer producer" },
  { id: "farmer_consumer", label: "Farmer consumer" },
];

function matchesKind(user: AdminAppUser, kind: AppUserKind) {
  if (kind === "all") return true;
  if (kind === "business_single") return user.organisationType === "BUSINESS_SINGLE";
  if (kind === "business_multi") return user.organisationType === "BUSINESS_MULTI";
  if (kind === "charity_single") return user.organisationType === "CHARITY_SINGLE" || user.organisationType === "CHARITY";
  if (kind === "charity_multi") return user.organisationType === "CHARITY_MULTI";
  if (kind === "farmer_producer") return user.organisationType === "FARMER_PRODUCER";
  return user.organisationType === "FARMER_CONSUMER";
}

function roleLabel(role?: string | null) {
  if (role === "SUPER_ADMIN") return "Account owner";
  if (role === "ORG_ADMIN") return "Org admin";
  if (role === "ORG_MEMBER") return "Team member";
  return role || "—";
}

function regionLabel(region?: string | null) {
  if (region === "AU") return "Australia";
  if (region === "IN") return "India";
  if (region === "US") return "United States";
  return region || "—";
}

export function AdminAppUsers() {
  const { query } = useAdminFilters();
  const [kind, setKind] = useState<AppUserKind>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [users, setUsers] = useState<AdminAppUser[]>([]);
  const [counts, setCounts] = useState<Partial<Record<AppUserKind, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listAdminAppUsers()
      .then((payload) => {
        if (cancelled) return;
        setUsers(payload.users ?? []);
        setCounts(payload.counts ?? {});
        setError("");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "App users could not be loaded.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return users.filter((user) => {
      if (!matchesKind(user, kind)) return false;
      if (!needle) return true;
      return [user.name, user.email, user.organisationName, user.mobile]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(needle));
    });
  }, [users, kind, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const current = Math.min(page, pageCount);
  const paged = filtered.slice((current - 1) * pageSize, current * pageSize);

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="App users"
      hint="People who signed up in the Saveful for Business app. Enterprise portal users stay under Enterprise users."
    >
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">
          {error} Restart the API with the latest app users endpoint, then refresh this page.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((item) => {
          const count = counts[item.id] ?? (item.id === "all" ? users.length : 0);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setKind(item.id);
                setPage(1);
              }}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 font-saveful-semibold text-xs transition",
                kind === item.id
                  ? "bg-saveful-green text-white"
                  : "bg-[#F7F6F2] text-gray-600 hover:bg-[#EFEDE6]",
              )}
            >
              {item.label}
              <span className={cn("tabular-nums", kind === item.id ? "text-white/80" : "text-gray-400")}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <AdminSection
        title={KINDS.find((item) => item.id === kind)?.label ?? "Directory"}
        action={
          <span className="font-saveful text-xs text-gray-500">
            {loading ? "Loading signups…" : `${filtered.length} ${filtered.length === 1 ? "user" : "users"}`}
          </span>
        }
      >
        <label className="relative mb-3 block max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search name, email or organisation"
            className="h-10 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] pl-10 pr-3 font-saveful text-sm outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white"
          />
        </label>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2.5 font-saveful">User</th>
                <th className="px-3 py-2.5 font-saveful">Organisation</th>
                <th className="px-3 py-2.5 font-saveful">App type</th>
                <th className="px-3 py-2.5 font-saveful">Region</th>
                <th className="px-3 py-2.5 font-saveful">Status</th>
                <th className="px-3 py-2.5 font-saveful">Signed up</th>
                <th className="px-3 py-2.5 font-saveful">Last login</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row) => (
                <tr key={`${row.organisationId}-${row.id}`} className="border-b border-gray-50 last:border-0">
                  <td className="px-3 py-3">
                    <p className="font-saveful-semibold text-sm text-gray-900">{row.name}</p>
                    <p className="font-saveful text-xs text-gray-500">{row.email}</p>
                    {row.mobile ? <p className="font-saveful text-[11px] text-gray-400">{row.mobile}</p> : null}
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-saveful text-sm text-gray-800">{row.organisationName}</p>
                    <p className="font-saveful text-[11px] text-gray-400">{roleLabel(row.orgRole)}</p>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-saveful text-sm text-gray-800">{row.organisationTypeLabel}</p>
                    {row.plan ? <p className="font-saveful text-[11px] text-gray-400">{row.plan}</p> : null}
                  </td>
                  <td className="px-3 py-3 font-saveful text-sm text-gray-700">{regionLabel(row.region)}</td>
                  <td className="px-3 py-3">
                    <StatusPill status={row.status} />
                  </td>
                  <td className="px-3 py-3 font-saveful text-sm text-gray-600">
                    {row.createdAt ? formatDisplayDate(row.createdAt) : "—"}
                  </td>
                  <td className="px-3 py-3 font-saveful text-sm text-gray-600">
                    {row.lastLoginAt ? formatLastActivity(row.lastLoginAt) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && filtered.length === 0 ? (
          <p className="px-3 py-8 text-center font-saveful text-sm text-gray-500">
            No app signups in this group yet.
          </p>
        ) : null}

        <TablePager
          page={current}
          pageSize={pageSize}
          total={filtered.length}
          noun="users"
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size);
            setPage(1);
          }}
        />
      </AdminSection>
    </AdminPage>
  );
}
