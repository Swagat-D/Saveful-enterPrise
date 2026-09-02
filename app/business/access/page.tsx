"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, ChevronDown, MapPin, Trash2, Users } from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { PortalPageHeader, PortalPageShell } from "@/components/ui/Portal";
import { ApiError } from "@/lib/api";
import {
  addBusinessStaff,
  getBusinessOrganisation,
  inviteSiteManager,
  listBusinessSiteStaff,
  removeSiteAccess,
  type BusinessSiteStaffRow,
} from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import { useEntitlements } from "@/lib/businessBilling";
import {
  isBusinessMultiHeadOffice,
  parseLiveSiteId,
  sitesFromOrganisationPayload,
  type BusinessSiteRow,
} from "@/lib/businessHqSite";
import { billingCycleLabel, formatBillingDate } from "@/lib/businessPlanCopy";
import { cn } from "@/lib/utils";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#E4E0D6] bg-[#F7F6F2] px-3.5 font-saveful text-sm text-gray-900 outline-none transition focus:border-saveful-green/40 focus:bg-white";

const ROLE_OPTIONS = [
  { label: "Site Admin", value: "SITE_ADMIN" },
  { label: "Staff", value: "STAFF" },
] as const;

type TeamMember = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobile: string;
  role: string;
};

function staffFromPayload(payload: unknown): TeamMember[] {
  const rows = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as { staff?: unknown }).staff)
      ? (payload as { staff: BusinessSiteStaffRow[] }).staff
      : [];
  return rows
    .map((item) => ({
      id: Number(item.user?.id ?? item.userId),
      firstName: item.user?.firstName ?? "",
      lastName: item.user?.lastName ?? "",
      email: item.user?.email ?? "",
      mobile: item.user?.phoneNumber ?? "",
      role: String(item.siteRole || ""),
    }))
    .filter((member) => Number.isFinite(member.id) && member.id > 0);
}

export default function BusinessAccessPage() {
  return (
    <BusinessGate>
      <Suspense fallback={null}>
        <AccessInner />
      </Suspense>
    </BusinessGate>
  );
}

function AccessInner() {
  const user = useBusinessSession();
  const searchParams = useSearchParams();
  const { entitlements } = useEntitlements();
  const [sites, setSites] = useState<BusinessSiteRow[]>([]);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [loadingTeam, setLoadingTeam] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    role: "",
  });
  const [roleOpen, setRoleOpen] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const savingRef = useRef(false);

  const needsPlan = Boolean(entitlements?.billingRequired && !entitlements.entitled);
  const maxUsers = entitlements?.maxUserPerSite ?? 0;
  const isLimitReached = maxUsers > 0 && members.length >= maxUsers;
  const isMulti = Boolean(user && (user.role === "restaurant_multi" || isBusinessMultiHeadOffice(user)));
  const selectedSite = sites.find((site) => site.id === siteId) ?? null;
  const locationCount = sites.length;

  const planLabel = entitlements?.planDisplayName || entitlements?.planName || "No active plan";
  const priceHint = entitlements?.entitled
    ? entitlements.status === "TRIALING" && entitlements.trialEndsAt
      ? `Trial ends ${new Date(entitlements.trialEndsAt).toLocaleDateString()}`
      : entitlements.status
        ? entitlements.status.replace(/_/g, " ").toLowerCase()
        : "active"
    : entitlements?.billingRequired
      ? "This organisation needs activation"
      : "free";

  const billingSummary = useMemo(() => {
    if (!entitlements?.entitled) return null;
    const parts: string[] = [];
    if (entitlements.billingCycle) parts.push(`Billed ${billingCycleLabel(entitlements.billingCycle)}`);
    const renews = formatBillingDate(entitlements.currentPeriodEnd);
    if (renews) parts.push(entitlements.cancelAtPeriodEnd ? `Ends ${renews}` : `Renews ${renews}`);
    return parts.length ? parts.join(" · ") : null;
  }, [entitlements]);

  const loadTeam = useCallback(async (id: number) => {
    setLoadingTeam(true);
    try {
      setMembers(staffFromPayload(await listBusinessSiteStaff(id)));
    } finally {
      setLoadingTeam(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      setLoadingSites(true);
      try {
        const rows = sitesFromOrganisationPayload(await getBusinessOrganisation());
        if (cancelled) return;
        setSites(rows);
        const queried = parseLiveSiteId(searchParams.get("siteId"));
        if (queried && rows.some((site) => site.id === queried)) {
          setSiteId(queried);
          return;
        }
        if (!isMulti && rows[0]) setSiteId(rows[0].id);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load locations.");
      } finally {
        if (!cancelled) setLoadingSites(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isMulti, searchParams, user]);

  useEffect(() => {
    if (!siteId) {
      setMembers([]);
      return;
    }
    void loadTeam(siteId).catch((err) => {
      setError(err instanceof Error ? err.message : "Could not load team members.");
      setMembers([]);
    });
  }, [loadTeam, siteId]);

  const selectSite = (id: number) => {
    setError("");
    setNotice("");
    setSiteId(id);
    setForm({ firstName: "", lastName: "", email: "", mobile: "", password: "", role: "" });
    setRoleOpen(false);
  };

  const handleSubmit = async () => {
    if (savingRef.current || submitting) return;
    setError("");
    setNotice("");

    if (needsPlan) {
      setError("Activate a plan before inviting your team.");
      return;
    }
    if (siteId == null || siteId <= 0) {
      setError(isMulti ? "Select a location first." : "Your business site is not set up yet.");
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("First name and last name are required.");
      return;
    }
    if (!form.email.trim() || !form.password.trim() || !form.role) {
      setError("Email, password, and role are required.");
      return;
    }

    const payload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim(),
      password: form.password,
      phoneNumber: form.mobile.trim() || undefined,
    };

    savingRef.current = true;
    setSubmitting(true);
    try {
      if (form.role === "SITE_ADMIN") await inviteSiteManager(siteId, payload);
      else await addBusinessStaff(siteId, payload);
      setNotice("User added");
      setForm({ firstName: "", lastName: "", email: "", mobile: "", password: "", role: "" });
      setRoleOpen(false);
      await loadTeam(siteId);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not add user.");
    } finally {
      savingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleDelete = async (userId: number) => {
    if (!siteId || deletingId != null) return;
    if (!window.confirm("Remove user? Are you sure?")) return;
    setDeletingId(userId);
    setError("");
    try {
      await removeSiteAccess(siteId, userId);
      await loadTeam(siteId);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not remove user.");
    } finally {
      setDeletingId(null);
    }
  };

  const selectedRole = ROLE_OPTIONS.find((option) => option.value === form.role);
  const canManageTeam = Boolean(siteId);

  return (
    <PortalPageShell>
      <PortalPageHeader
        eyebrow="Organisation"
        title="Manage Access"
        description="Invite site admins and staff. They only log in — they never buy."
      />

      <div className="mx-auto w-full max-w-3xl space-y-5">
        <section className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-saveful text-[11px] uppercase tracking-[0.16em] text-gray-400">Current plan</p>
              <h2 className="mt-1 font-saveful-bold text-lg text-gray-900">{planLabel}</h2>
              <p className="mt-0.5 font-saveful text-sm capitalize text-gray-500">{priceHint}</p>
              {billingSummary ? <p className="mt-1 font-saveful text-xs text-gray-400">{billingSummary}</p> : null}
            </div>
            <Link
              href="/business/plans"
              className="font-saveful-semibold text-sm text-saveful-green hover:underline"
            >
              {needsPlan ? "Choose a plan" : "Manage billing"}
            </Link>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-[#F7F6F2] px-3.5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-saveful-green">
                <Building2 className="h-4 w-4" />
              </span>
              <div>
                <p className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-400">Locations</p>
                <p className="font-saveful-semibold text-sm text-gray-900">
                  {locationCount} {locationCount === 1 ? "location" : "locations"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-[#F7F6F2] px-3.5 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-saveful-green">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <p className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-400">Users on this site</p>
                <p className="font-saveful-semibold text-sm text-gray-900">
                  {canManageTeam ? members.length : "Select a location"}
                </p>
              </div>
            </div>
          </div>
          {entitlements?.cancelAtPeriodEnd ? (
            <p className="mt-3 font-saveful text-sm text-red-600">
              {entitlements.currentPeriodEnd
                ? `Cancelled — access continues until ${formatBillingDate(entitlements.currentPeriodEnd)}.`
                : "Cancelled — access continues until the end of this period."}
            </p>
          ) : null}
        </section>

        {isMulti ? (
          <section className="rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <div className="mb-4">
              <h2 className="font-saveful-bold text-base text-gray-900">Select a location</h2>
              <p className="mt-1 font-saveful text-sm text-gray-500">
                Choose which of your {locationCount} locations you want to manage first.
              </p>
            </div>
            {loadingSites ? (
              <p className="font-saveful text-sm text-gray-500">Loading locations…</p>
            ) : sites.length === 0 ? (
              <p className="font-saveful text-sm text-gray-500">
                No locations yet.{" "}
                <Link href="/business/locations/new" className="font-saveful-semibold text-saveful-green hover:underline">
                  Add a location
                </Link>
              </p>
            ) : (
              <select
                value={siteId ?? ""}
                onChange={(event) => {
                  const next = parseLiveSiteId(event.target.value);
                  if (next) selectSite(next);
                }}
                className={fieldClass}
              >
                <option value="" disabled>
                  Choose a location
                </option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.siteName}
                    {site.address ? ` — ${site.address}` : ""}
                  </option>
                ))}
              </select>
            )}
          </section>
        ) : selectedSite ? (
          <section className="flex items-center gap-3 rounded-2xl border border-black/[0.04] bg-white px-5 py-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F0F8F3] text-saveful-green">
              <MapPin className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="font-saveful-semibold text-sm text-gray-900">{selectedSite.siteName}</p>
              {selectedSite.address ? (
                <p className="truncate font-saveful text-xs text-gray-500">{selectedSite.address}</p>
              ) : null}
            </div>
          </section>
        ) : null}

        {!canManageTeam && isMulti && !loadingSites ? (
          <p className="rounded-xl bg-[#F7F6F2] px-4 py-3 font-saveful text-sm text-gray-500">
            Select a location above to add or remove team members.
          </p>
        ) : null}

        {canManageTeam ? (
          <>
            <section className="space-y-4 rounded-2xl border border-black/[0.04] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
              <div>
                <h2 className="font-saveful-bold text-base text-gray-900">Add Team Member</h2>
                {selectedSite ? (
                  <p className="mt-1 font-saveful text-sm text-gray-500">
                    Adding to <span className="font-saveful-semibold text-gray-700">{selectedSite.siteName}</span>
                  </p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">First name</span>
                  <input
                    value={form.firstName}
                    onChange={(event) => setForm({ ...form, firstName: event.target.value })}
                    placeholder="Enter first name"
                    autoComplete="given-name"
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Last name</span>
                  <input
                    value={form.lastName}
                    onChange={(event) => setForm({ ...form, lastName: event.target.value })}
                    placeholder="Enter last name"
                    autoComplete="family-name"
                    className={fieldClass}
                  />
                </label>
              </div>
              <label className="block">
                <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Email</span>
                <input
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  placeholder="Enter email"
                  type="email"
                  autoComplete="off"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Phone number</span>
                <input
                  value={form.mobile}
                  onChange={(event) => setForm({ ...form, mobile: event.target.value })}
                  placeholder="Enter phone number"
                  type="tel"
                  className={fieldClass}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Password</span>
                <input
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  placeholder="Enter password"
                  type="password"
                  autoComplete="new-password"
                  className={fieldClass}
                />
              </label>

              <div>
                <p className="mb-1.5 font-saveful-semibold text-sm text-gray-800">Role</p>
                <div className="overflow-hidden rounded-[10px] border border-[#D9D9D9] bg-white">
                  <button
                    type="button"
                    onClick={() => setRoleOpen((open) => !open)}
                    className="flex h-11 w-full items-center justify-between px-3.5 text-left"
                  >
                    <span className={cn("font-saveful text-sm", form.role ? "text-gray-900" : "text-gray-400")}>
                      {selectedRole?.label || "Select role"}
                    </span>
                    <ChevronDown className={cn("h-4 w-4 text-saveful-green transition", roleOpen && "rotate-180")} />
                  </button>
                  {roleOpen ? (
                    <div className="border-t border-[#ECECEC]">
                      {ROLE_OPTIONS.map((option) => {
                        const selected = form.role === option.value;
                        return (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setForm({ ...form, role: option.value });
                              setRoleOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2.5 px-3.5 py-3 text-left",
                              selected ? "bg-[#F7FAF7]" : "hover:bg-[#F7F6F2]",
                            )}
                          >
                            <span
                              className={cn(
                                "flex h-[18px] w-[18px] items-center justify-center rounded-full border-2",
                                selected ? "border-saveful-green" : "border-[#C8C8C8]",
                              )}
                            >
                              {selected ? <span className="h-2 w-2 rounded-full bg-saveful-green" /> : null}
                            </span>
                            <span className="font-saveful text-sm text-gray-900">{option.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>

              {error ? <p className="font-saveful text-sm text-amber-800">{error}</p> : null}
              {notice ? <p className="font-saveful text-sm text-saveful-green">{notice}</p> : null}

              <button
                type="button"
                disabled={submitting || isLimitReached || needsPlan}
                onClick={() => void handleSubmit()}
                className="h-11 w-full rounded-xl bg-saveful-green font-saveful-semibold text-white disabled:bg-[#ccc]"
              >
                {submitting ? "Adding..." : "+ Add User"}
              </button>
            </section>

            <section className="space-y-3">
              <h2 className="font-saveful-semibold text-sm text-gray-900">
                Team Members{selectedSite ? ` · ${selectedSite.siteName}` : ""}
              </h2>
              {loadingTeam ? (
                <p className="font-saveful text-sm text-gray-500">Loading team…</p>
              ) : members.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.04] bg-white px-5 py-8 text-center">
                  <p className="font-saveful-semibold text-sm text-gray-800">No team members yet</p>
                  <p className="mt-1 font-saveful text-sm text-gray-500">Add a site admin or staff for this location.</p>
                </div>
              ) : (
                members.map((member) => (
                  <article
                    key={member.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#F0F8F3] font-saveful-semibold text-sm text-saveful-green">
                        {(member.firstName[0] || member.email[0] || "?").toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="font-saveful-semibold text-sm text-gray-900">
                          {member.firstName} {member.lastName}
                        </p>
                        <p className="truncate font-saveful text-sm text-gray-500">{member.email}</p>
                        {member.mobile ? <p className="font-saveful text-xs text-gray-400">{member.mobile}</p> : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-full bg-[#F7F6F2] px-2.5 py-1 font-saveful-semibold text-[11px] text-gray-600">
                        {member.role === "SITE_ADMIN" ? "Site Admin" : "Staff"}
                      </span>
                      {member.role !== "SITE_ADMIN" ? (
                        <button
                          type="button"
                          disabled={deletingId != null}
                          onClick={() => void handleDelete(member.id)}
                          className="rounded-lg p-2 text-red-500 hover:bg-red-50 disabled:opacity-50"
                          aria-label="Remove user"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </article>
                ))
              )}
            </section>
          </>
        ) : null}
      </div>
    </PortalPageShell>
  );
}
