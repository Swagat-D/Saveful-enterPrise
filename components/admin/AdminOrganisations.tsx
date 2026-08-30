"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  ClipboardList,
  Info,
  Leaf,
  MapPin,
  ImagePlus,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from "lucide-react";
import { AdminPage, AdminRowMenu, AdminSection, FilterSelect, StatusPill, TablePager, useAdminFilters, type PageSize } from "@/components/admin/AdminChrome";
import { MoreFilters } from "@/components/network/FilterBar";
import {
  ACCOUNT_STATUSES,
  ADMIN_COUNTRIES,
  ADMIN_CURRENCIES,
  ADMIN_MEASUREMENT_UNITS,
  ADMIN_REGIONS,
  ADMIN_TIMEZONES,
  ORG_PLANS,
  ORG_TYPES,
  PARTICIPATION_ROLES,
  buildOrgDirectory,
  createOrganisation,
  formatEnterpriseId,
  listOrganisationDirectoryActivity,
  orgCounts,
  orgTypeLabel,
  planLabel,
  useAdminVersion,
  roleShortLabel,
  updateOrganisation,
  type AdminOrganisation,
} from "@/lib/admin";
import type { ApiRegion, MeasurementUnit } from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAdminAuditVersion } from "@/lib/adminAudit";
import { useSession } from "@/lib/auth";
import { formatDisplayDate } from "@/lib/dates";
import { formatCount } from "@/lib/impact";
import { cn } from "@/lib/utils";

export function AdminOrganisations() {
  const user = useSession();
  useAdminVersion();
  useAdminAuditVersion();
  const { filters, update, reset, query } = useAdminFilters();
  const directory = buildOrgDirectory(filters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<PageSize>(10);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setPage(1);
    setMenuId(null);
  }, [filters.q, filters.orgType, filters.role, filters.state, filters.accountStatus, filters.activityStatus, filters.plan, filters.country, pageSize]);

  const pageCount = Math.max(1, Math.ceil(directory.organisations.length / pageSize));
  const current = Math.min(page, pageCount);
  const rows = directory.organisations.slice((current - 1) * pageSize, current * pageSize);
  const recent = listOrganisationDirectoryActivity(filters, 5);

  const metrics = [
    { label: "Organisations", value: formatCount(directory.metrics.organisations), hint: null, icon: Building2, tone: "bg-saveful-green/10 text-saveful-green" },
    { label: "Active sites", value: formatCount(directory.metrics.activeSites), hint: signed(directory.metrics.activeSitesDelta), icon: MapPin, tone: "bg-violet-50 text-violet-700" },
    { label: "Active users", value: formatCount(directory.metrics.activeUsers), hint: null, icon: Users, tone: "bg-teal-50 text-teal-700" },
    { label: "Listings (period)", value: formatCount(directory.metrics.listings), hint: signed(directory.metrics.listingsDelta), icon: ClipboardList, tone: "bg-sky-50 text-sky-700" },
    { label: "Collections (period)", value: formatCount(directory.metrics.collections), hint: signed(directory.metrics.collectionsDelta), icon: Leaf, tone: "bg-saveful-green/10 text-saveful-green" },
  ];

  const directoryActive =
    Boolean(filters.q) ||
    filters.period !== "30" ||
    filters.country !== "all" ||
    filters.state !== "all" ||
    filters.orgType !== "all" ||
    filters.role !== "all" ||
    filters.organisationId !== "all" ||
    filters.accountStatus !== "all" ||
    filters.activityStatus !== "all" ||
    filters.plan !== "all";

  const filterCount = [
    filters.orgType !== "all",
    filters.role !== "all",
    filters.state !== "all",
    filters.accountStatus !== "all",
    filters.activityStatus !== "all",
    filters.plan !== "all",
  ].filter(Boolean).length;

  const renderFilterFields = () => (
    <>
      <FilterSelect
        compact
        label="Organisation Type"
        value={filters.orgType}
        onChange={(orgType) => update({ orgType: orgType as typeof filters.orgType, organisationId: "all" })}
        options={[{ id: "all", name: "All" }, ...ORG_TYPES.map((item) => ({ id: item.id, name: item.label }))]}
      />
      <FilterSelect
        compact
        label="Participation Role"
        value={filters.role}
        onChange={(role) => update({ role: role as typeof filters.role, organisationId: "all" })}
        options={[
          { id: "all", name: "All" },
          ...PARTICIPATION_ROLES.map((item) => ({ id: item.id, name: item.label })),
          { id: "both", name: "Both" },
        ]}
      />
      <FilterSelect
        compact
        label="Territory"
        value={filters.state}
        onChange={(state) => update({ state, organisationId: "all" })}
        options={[{ id: "all", name: "All" }, ...directory.territories.map((id) => ({ id, name: id }))]}
      />
      <FilterSelect
        compact
        label="Account Status"
        value={filters.accountStatus}
        onChange={(accountStatus) => update({ accountStatus: accountStatus as typeof filters.accountStatus })}
        options={[{ id: "all", name: "All" }, ...ACCOUNT_STATUSES.map((item) => ({ id: item.id, name: item.label }))]}
      />
      <FilterSelect
        compact
        label="Activity Status"
        value={filters.activityStatus}
        onChange={(activityStatus) => update({ activityStatus: activityStatus as typeof filters.activityStatus })}
        options={[
          { id: "all", name: "All" },
          { id: "active", name: "Active" },
          { id: "inactive", name: "Inactive" },
        ]}
      />
      <FilterSelect
        compact
        label="Plan"
        value={filters.plan}
        onChange={(plan) => update({ plan: plan as typeof filters.plan })}
        options={[{ id: "all", name: "All" }, ...ORG_PLANS.map((item) => ({ id: item.id, name: item.label }))]}
      />
    </>
  );

  return (
    <AdminPage
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Organisations"
      hint="Master directory of every organisation in the Saveful for Business ecosystem."
      actions={
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white sm:w-auto"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Organisation
        </button>
      }
    >
      <div className="rounded-xl border border-gray-200 bg-white p-3">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end">
          <label className="min-w-0 flex-1">
            <span className="mb-1 block truncate font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Search</span>
            <span className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                value={filters.q}
                onChange={(event) => update({ q: event.target.value })}
                placeholder="Search organisation name..."
                className="h-8 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] pl-8 pr-2.5 font-saveful text-xs text-gray-800 outline-none focus:border-saveful-green/40"
              />
            </span>
          </label>
          <div className="lg:hidden">
            <MoreFilters
              count={filterCount}
              summary={
                [
                  ORG_TYPES.find((item) => item.id === filters.orgType)?.label,
                  filters.role !== "all" ? (filters.role === "both" ? "Both" : PARTICIPATION_ROLES.find((item) => item.id === filters.role)?.label) : "",
                  filters.state !== "all" ? filters.state : "",
                  ACCOUNT_STATUSES.find((item) => item.id === filters.accountStatus)?.label,
                  filters.activityStatus !== "all" ? (filters.activityStatus === "active" ? "Active" : "Inactive") : "",
                  ORG_PLANS.find((item) => item.id === filters.plan)?.label,
                ]
                  .filter(Boolean)
                  .join(" · ") || "All organisations"
              }
              title="Filter organisations"
              subtitle="Refine the directory without shrinking the list."
              onReset={() => reset()}
            >
              <div className="grid grid-cols-1 gap-3">
                {renderFilterFields()}
              </div>
            </MoreFilters>
          </div>
          <div className="hidden min-w-0 flex-[2] grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6 lg:grid">
            {renderFilterFields()}
          </div>
          <button
            type="button"
            onClick={() => reset()}
            disabled={!directoryActive}
            className={cn(
              "hidden h-8 shrink-0 items-center gap-1 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful-semibold text-xs text-gray-500 lg:inline-flex",
              directoryActive ? "hover:text-saveful-green" : "opacity-40",
            )}
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
        </div>
      </div>

      {notice ? (
        <p className="rounded-xl border border-saveful-green/20 bg-saveful-green/[0.06] px-3.5 py-2.5 font-saveful text-sm text-saveful-green">
          {notice}
        </p>
      ) : null}

      {adding ? (
        <AddOrganisationForm
          onClose={() => setAdding(false)}
          actor={{ name: user?.name ?? "Saveful Admin", email: user?.email ?? "" }}
          onCreated={(message) => {
            setNotice(message);
            setAdding(false);
          }}
        />
      ) : null}

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
        {metrics.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-xl border border-gray-200 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2">
                <p className="truncate font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">{card.label}</p>
                <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg", card.tone)}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-2 font-saveful-bold text-xl tabular-nums leading-none text-gray-900">{card.value}</p>
              {card.hint ? <p className="mt-1.5 font-saveful text-[11px] text-emerald-700">{card.hint} vs prior period</p> : null}
            </article>
          );
        })}
      </div>

      <AdminSection title={`Organisations (${formatCount(directory.organisations.length)})`}>
        <div className="hidden overflow-x-auto lg:block">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                <th className="px-3 py-2.5 font-saveful">Organisation</th>
                <th className="px-3 py-2.5 font-saveful">Type</th>
                <th className="px-3 py-2.5 font-saveful">Role</th>
                <th className="px-3 py-2.5 font-saveful">Territory</th>
                <th className="px-3 py-2.5 font-saveful">Sites</th>
                <th className="px-3 py-2.5 font-saveful">Users</th>
                <th className="px-3 py-2.5 font-saveful">Activity</th>
                <th className="px-3 py-2.5 font-saveful">Account</th>
                <th className="px-3 py-2.5 font-saveful">Plan</th>
                <th className="px-3 py-2.5 font-saveful">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((org) => {
                const counts = orgCounts(org.id, filters.period);
                return (
                  <tr key={org.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-2.5">
                      <Link href={`/admin/organisations/${org.id}${query}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                        {org.name}
                      </Link>
                      <p className="font-saveful text-[11px] text-gray-400">{org.enterpriseId ? `${formatEnterpriseId(org.enterpriseId)} · ${org.country}` : org.country}</p>
                    </td>
                    <td className="px-3 py-2.5 font-saveful text-sm text-gray-700">{orgTypeLabel(org.type)}</td>
                    <td className="px-3 py-2.5 font-saveful text-sm text-gray-700">{roleShortLabel(org.roles)}</td>
                    <td className="px-3 py-2.5 font-saveful text-sm text-gray-700">{org.state}</td>
                    <td className="px-3 py-2.5 font-saveful text-sm tabular-nums text-gray-800">{formatCount(counts.sites)}</td>
                    <td className="px-3 py-2.5 font-saveful text-sm tabular-nums text-gray-800">{formatCount(counts.users)}</td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={counts.activityStatus} />
                    </td>
                    <td className="px-3 py-2.5">
                      <StatusPill status={org.status} />
                    </td>
                    <td className="px-3 py-2.5 font-saveful text-sm text-gray-700">{planLabel(org.plan)}</td>
                    <td className="px-3 py-2.5">
                      <OrgActionsMenu
                        org={org}
                        query={query}
                        open={menuId === org.id}
                        onOpenChange={(open) => setMenuId(open ? org.id : null)}
                        actor={{ name: user?.name ?? "Saveful Admin", email: user?.email ?? "" }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-gray-100 lg:hidden">
          {rows.map((org) => {
            const counts = orgCounts(org.id, filters.period);
            return (
              <article key={org.id} className="flex items-start gap-3 px-3.5 py-3">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/organisations/${org.id}${query}`} className="font-saveful-semibold text-sm text-saveful-green hover:underline">
                    {org.name}
                  </Link>
                  <p className="font-saveful text-[11px] text-gray-400">{org.enterpriseId ? `${formatEnterpriseId(org.enterpriseId)} · ${org.country}` : org.country}</p>
                  <p className="mt-1.5 font-saveful text-xs text-gray-500">
                    {orgTypeLabel(org.type)} · {roleShortLabel(org.roles)} · {org.state}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusPill status={counts.activityStatus} />
                    <StatusPill status={org.status} />
                    <span className="font-saveful text-[11px] text-gray-500">{planLabel(org.plan)}</span>
                  </div>
                  <p className="mt-1.5 font-saveful text-[11px] text-gray-400">
                    {formatCount(counts.sites)} sites · {formatCount(counts.users)} users
                  </p>
                </div>
                <OrgActionsMenu
                  org={org}
                  query={query}
                  open={menuId === org.id}
                  onOpenChange={(open) => setMenuId(open ? org.id : null)}
                  actor={{ name: user?.name ?? "Saveful Admin", email: user?.email ?? "" }}
                />
              </article>
            );
          })}
        </div>
        {rows.length === 0 ? (
          <p className="px-3.5 py-8 text-center font-saveful text-sm text-gray-500">No organisations match these filters.</p>
        ) : (
          <TablePager
            page={current}
            pageSize={pageSize}
            total={directory.organisations.length}
            noun="organisations"
            onPage={setPage}
            onPageSize={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </AdminSection>

      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <AdminSection title="Account status vs activity status">
          <div className="flex gap-3 px-3.5 py-3">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-saveful-green" />
            <div className="space-y-2 font-saveful text-sm text-gray-600">
              <p>
                <span className="font-saveful-semibold text-gray-900">Account status</span> is the organisation lifecycle: Active, Prospect or Suspended.
              </p>
              <p>
                <span className="font-saveful-semibold text-gray-900">Activity status</span> is recent platform use in the last 30 days: Active or Inactive. An account can be Active and still Inactive.
              </p>
            </div>
          </div>
        </AdminSection>
        <AdminSection title="Recent activity" action={<Link href={`/admin/activity${query}`} className="whitespace-nowrap font-saveful-semibold text-xs text-saveful-green hover:underline">View all →</Link>}>
          <ul className="max-h-[10.5rem] overflow-y-auto">
            {recent.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-3 border-b border-gray-50 px-3.5 py-2.5 last:border-0">
                <div className="min-w-0">
                  {item.href ? (
                    <Link href={`${item.href}${query}`} className="truncate font-saveful text-sm text-gray-800 hover:text-saveful-green">
                      {item.kind}
                    </Link>
                  ) : (
                    <p className="truncate font-saveful text-sm text-gray-800">{item.kind}</p>
                  )}
                  <p className="truncate font-saveful text-[11px] text-gray-400">{item.detail}</p>
                </div>
                <p className="shrink-0 font-saveful text-[11px] text-gray-400">{formatDisplayDate(item.at.slice(0, 10))}</p>
              </li>
            ))}
            {recent.length === 0 ? <li className="px-3.5 py-6 text-center font-saveful text-sm text-gray-500">No recent organisation activity.</li> : null}
          </ul>
        </AdminSection>
      </div>
    </AdminPage>
  );
}

export function AddOrganisationForm({
  onClose,
  actor,
  onCreated,
  asModal = true,
}: {
  onClose?: () => void;
  actor: { name: string; email: string };
  onCreated?: (message: string) => void;
  asModal?: boolean;
}) {
  const [enterpriseName, setEnterpriseName] = useState("");
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("AU");
  const [timezone, setTimezone] = useState("Australia/Sydney");
  const [currency, setCurrency] = useState("AUD");
  const [measurementUnit, setMeasurementUnit] = useState<MeasurementUnit>("METRIC");
  const [region, setRegion] = useState<ApiRegion | "">("AU");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const [adminFirstName, setAdminFirstName] = useState("");
  const [adminLastName, setAdminLastName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminMobile, setAdminMobile] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const logoRef = useRef<HTMLInputElement>(null);

  const selectCountry = (next: string) => {
    setCountry(next);
    const match = ADMIN_COUNTRIES.find((item) => item.id === next);
    if (!match) return;
    setTimezone(match.timezone);
    setCurrency(match.currency);
    setRegion(match.region ?? "");
  };

  useEffect(() => {
    if (!asModal) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [asModal, onClose]);

  useEffect(() => {
    return () => {
      if (logoPreview) URL.revokeObjectURL(logoPreview);
    };
  }, [logoPreview]);

  const onLogo = (file: File | undefined) => {
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Logo must be a PNG, JPG, or WEBP file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }
    setError("");
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(null);
    setLogoPreview("");
    if (logoRef.current) logoRef.current.value = "";
  };

  const fieldClass =
    "h-10 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none focus:border-saveful-green/40 sm:h-8";

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setSaving(true);
    try {
      const created = await createOrganisation(
        {
          enterpriseName,
          address,
          country,
          timezone,
          currency,
          measurementUnit,
          region: region || undefined,
          logoFile,
          adminFirstName,
          adminLastName,
          adminEmail,
          adminMobile,
        },
        actor,
      );
      onCreated?.(
        created.enterpriseId
          ? `${created.message} Enterprise ID ${formatEnterpriseId(created.enterpriseId)}.`
          : created.message,
      );
      if (!onCreated) onClose?.();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not create organisation");
    } finally {
      setSaving(false);
    }
  };

  const fields = (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {error ? (
        <div className="rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2 font-saveful text-sm text-red-700 sm:col-span-2">
          {error}
        </div>
      ) : null}
      <label className="block sm:col-span-2">
        <span className="mb-1 block font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Enterprise name</span>
        <input required maxLength={160} value={enterpriseName} onChange={(event) => setEnterpriseName(event.target.value)} className={fieldClass} />
      </label>
      <div className="sm:col-span-2">
        <p className="mb-1 font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Enterprise ID</p>
        <p className="flex h-10 items-center rounded-lg border border-dashed border-black/[0.08] bg-[#F7F6F2] px-2.5 font-saveful text-sm text-gray-400 sm:h-8">
          Generated automatically on save
        </p>
      </div>
      <label className="block sm:col-span-2">
        <span className="mb-1 block font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Address</span>
        <input required maxLength={200} value={address} onChange={(event) => setAddress(event.target.value)} className={fieldClass} />
      </label>
      <FilterSelect compact label="Country" value={country} onChange={selectCountry} options={ADMIN_COUNTRIES} />
      <FilterSelect compact label="Timezone" value={timezone} onChange={setTimezone} options={ADMIN_TIMEZONES.map((id) => ({ id, name: id }))} />
      <FilterSelect compact label="Currency" value={currency} onChange={setCurrency} options={ADMIN_CURRENCIES.map((id) => ({ id, name: id }))} />
      <FilterSelect compact label="Measurement unit" value={measurementUnit} onChange={(value) => setMeasurementUnit(value as MeasurementUnit)} options={ADMIN_MEASUREMENT_UNITS} />
      <FilterSelect
        compact
        label="Region"
        value={region}
        onChange={(value) => setRegion(value as ApiRegion | "")}
        options={[{ id: "", name: "—" }, ...ADMIN_REGIONS]}
      />
      <div className="sm:col-span-2">
        <p className="mb-1 font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Logo</p>
        <input
          ref={logoRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(event) => {
            onLogo(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <div className="flex flex-col gap-3 rounded-xl border border-black/[0.06] bg-[#F7F6F2] p-3 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white">
            {logoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoPreview} alt="Organisation logo preview" className="h-full w-full object-cover" />
            ) : (
              <ImagePlus className="h-5 w-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-saveful text-xs text-gray-500">
              PNG, JPG or WEBP, up to 2 MB. The photo is uploaded to S3 and stored as the logo URL.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => logoRef.current?.click()}
                className="inline-flex h-9 items-center rounded-lg bg-white px-3 font-saveful-semibold text-xs text-gray-800 sm:h-8"
              >
                {logoFile ? "Change photo" : "Upload photo"}
              </button>
              {logoFile ? (
                <button type="button" onClick={clearLogo} className="inline-flex h-9 items-center rounded-lg px-3 font-saveful-semibold text-xs text-gray-500 hover:bg-white sm:h-8">
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <label className="block">
        <span className="mb-1 block font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Admin first name</span>
        <input required maxLength={80} value={adminFirstName} onChange={(event) => setAdminFirstName(event.target.value)} className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Admin last name</span>
        <input required maxLength={80} value={adminLastName} onChange={(event) => setAdminLastName(event.target.value)} className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Admin email</span>
        <input required type="email" value={adminEmail} onChange={(event) => setAdminEmail(event.target.value)} className={fieldClass} />
      </label>
      <label className="block">
        <span className="mb-1 block font-saveful text-[10px] uppercase tracking-[0.12em] text-gray-500">Admin mobile</span>
        <input maxLength={30} value={adminMobile} onChange={(event) => setAdminMobile(event.target.value)} className={fieldClass} />
      </label>
      <p className="font-saveful text-[11px] text-gray-500 sm:col-span-2">
        The Super Admin receives an activation invitation. No password is set for them here.
      </p>
    </div>
  );

  const actions = (
    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
      {onClose ? (
        <button type="button" onClick={onClose} className="h-10 rounded-lg px-3 font-saveful-semibold text-sm text-gray-500 hover:bg-[#F7F6F2] sm:h-8">
          Cancel
        </button>
      ) : null}
      <button type="submit" disabled={saving} className="h-10 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white disabled:opacity-50 sm:h-8">
        {saving ? (logoFile ? "Uploading logo…" : "Saving…") : "Save organisation"}
      </button>
    </div>
  );

  const form = (
    <form className={cn(!asModal && "space-y-4 p-3.5")} onSubmit={submit}>
      {fields}
      <div className={cn(asModal ? "hidden" : "pt-1")}>{actions}</div>
    </form>
  );

  if (!asModal) {
    return <AdminSection title="Add organisation">{form}</AdminSection>;
  }

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-stretch justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close add organisation" className="absolute inset-0 bg-black/40 sm:bg-black/30" onClick={onClose} />
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-organisation-title"
        onSubmit={submit}
        className="relative flex h-[100dvh] w-full max-w-2xl flex-col overflow-hidden bg-white shadow-xl sm:h-auto sm:max-h-[min(88dvh,760px)] sm:rounded-2xl sm:border sm:border-black/[0.05]"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-400">Organisations</p>
            <h2 id="add-organisation-title" className="mt-1 font-saveful-bold text-lg text-gray-900">
              Add organisation
            </h2>
          </div>
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-lg p-1.5 text-gray-500 hover:bg-[#F7F6F2] hover:text-gray-800"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{fields}</div>
        <div className="shrink-0 border-t border-gray-100 bg-white px-4 py-3 sm:px-5">{actions}</div>
      </form>
    </div>,
    document.body,
  );
}

function OrgActionsMenu({
  org,
  query,
  open,
  onOpenChange,
  actor,
}: {
  org: AdminOrganisation;
  query: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actor: { name: string; email: string };
}) {
  const router = useRouter();
  const detailsHref = `/admin/organisations/${org.id}${query}`;
  const accountHref = `/admin/organisations/${org.id}${query ? `${query}&tab=account` : "?tab=account"}`;
  const itemClass = "block w-full px-3 py-2 text-left font-saveful text-sm text-gray-700 hover:bg-[#FAF7F0]";
  const go = (href: string) => {
    onOpenChange(false);
    router.push(href);
  };
  return (
    <AdminRowMenu label={`Actions for ${org.name}`} open={open} onOpenChange={onOpenChange}>
      <button type="button" role="menuitem" className={itemClass} onClick={() => go(detailsHref)}>
        View details
      </button>
      <button type="button" role="menuitem" className={itemClass} onClick={() => go(accountHref)}>
        Edit classification
      </button>
      <button
        type="button"
        className={itemClass}
        onClick={() => {
          updateOrganisation(
            org.id,
            { status: org.status === "Suspended" ? "Active" : "Suspended" },
            actor,
          );
          onOpenChange(false);
        }}
      >
        {org.status === "Suspended" ? "Reactivate account" : "Suspend account"}
      </button>
    </AdminRowMenu>
  );
}

function signed(value: number) {
  if (value > 0) return `+${formatCount(value)}`;
  if (value < 0) return formatCount(value);
  return "0";
}
