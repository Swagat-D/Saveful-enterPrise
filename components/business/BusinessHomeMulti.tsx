"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Building2,
  ChevronDown,
  Mail,
  Pencil,
  Phone,
  Plus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AddressPicker, type PickedLocation } from "@/components/sites/AddressPicker";
import { PortalPageShell, StatusBadge } from "@/components/ui/Portal";
import { Button } from "@/components/ui/button";
import { ApiError } from "@/lib/api";
import {
  deleteBusinessSite,
  getBusinessOrganisation,
  removeSiteAccess,
  updateBusinessOrganisationCoordinates,
  updateBusinessSite,
} from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import { useEntitlements } from "@/lib/businessBilling";
import {
  ensureDefaultHqSite,
  getHqOwnerContact,
  isBusinessMultiHeadOffice,
  isVirtualHqSiteId,
  pickDefaultSite,
  type BusinessSiteRow,
} from "@/lib/businessHqSite";
import { statusLabel } from "@/lib/businessTypes";

const fieldClass =
  "h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40";

const headerBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]";

type OrgSite = BusinessSiteRow & {
  contactName?: string | null;
  contactEmail?: string | null;
  phoneNumber?: string | null;
  managers?: Array<{
    userId: number;
    siteRole?: string;
    user?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  }>;
  staff?: Array<{
    userId: number;
    siteRole?: string;
    user?: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string };
  }>;
};

type HomeSite = {
  id: number;
  tradingName: string;
  address: string;
  postCode: string;
  managerId: number | null;
  contactName: string;
  email: string;
  mobile: string;
  latitude?: number | null;
  longitude?: number | null;
  hasManager: boolean;
  isDefault: boolean;
};

function personName(person?: { firstName?: string; lastName?: string }) {
  return [person?.firstName, person?.lastName].filter(Boolean).join(" ").trim();
}

function initialsFromName(name: string) {
  const parts = name
    .split(" ")
    .map((part) => part.trim())
    .filter((part) => part && part !== "-" && part.toLowerCase() !== "no" && part.toLowerCase() !== "manager");
  const letters = (parts.length ? parts : name.split(" "))
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
  return letters || "S";
}

export function BusinessHomeMulti() {
  const user = useBusinessSession();
  const { entitlements } = useEntitlements();
  const [rawSites, setRawSites] = useState<OrgSite[]>([]);
  const [sitesLoading, setSitesLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editForm, setEditForm] = useState({
    tradingName: "",
    address: "",
    postCode: "",
    latitude: NaN,
    longitude: NaN,
  });

  const needsPlan = Boolean(entitlements?.billingRequired && !entitlements.entitled);
  const billedLocked = entitlements ? !entitlements.entitled : needsPlan;

  const loadSites = useCallback(async () => {
    if (!user) return;
    setSitesLoading(true);
    try {
      const payload = await getBusinessOrganisation();
      let next = (payload.sites ?? []) as OrgSite[];
      if (next.length === 0 && isBusinessMultiHeadOffice(user)) {
        next = (await ensureDefaultHqSite(user)) as OrgSite[];
      }
      setRawSites(next);
    } catch {
      setRawSites([]);
    } finally {
      setSitesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void loadSites();
  }, [loadSites]);

  const sites = useMemo<HomeSite[]>(() => {
    if (!user) return [];
    const live = rawSites.filter((site) => site && !isVirtualHqSiteId(site.id));
    const merged = live.length > 0 ? live : isBusinessMultiHeadOffice(user) ? rawSites : [];
    const defaultId = pickDefaultSite(merged)?.id ?? merged[0]?.id;
    const owner = getHqOwnerContact(user);

    return merged.map((raw) => {
      const people = [...(raw.managers ?? []), ...(raw.staff ?? [])];
      const managerRow =
        people.find((row) => String(row.siteRole ?? "").toUpperCase() === "SITE_ADMIN") ?? people[0];
      const hasAssignedManager = Boolean(managerRow?.userId);
      const isDefault = raw.id === defaultId || isVirtualHqSiteId(raw.id);
      return {
        id: raw.id,
        tradingName: raw.siteName || `Site ${raw.id}`,
        address: raw.address || "",
        postCode: raw.postcode || "",
        managerId: managerRow?.userId ?? null,
        contactName: hasAssignedManager
          ? personName(managerRow?.user) || raw.contactName || "Manager"
          : isDefault
            ? owner.name || "Head office"
            : raw.contactName || "No manager assigned",
        email: hasAssignedManager
          ? managerRow?.user?.email || "-"
          : isDefault
            ? owner.email || raw.contactEmail || "-"
            : raw.contactEmail || "-",
        mobile: hasAssignedManager
          ? managerRow?.user?.phoneNumber || "-"
          : isDefault
            ? owner.mobile || raw.phoneNumber || "-"
            : raw.phoneNumber || "-",
        latitude: raw.latitude,
        longitude: raw.longitude,
        hasManager: hasAssignedManager || isDefault,
        isDefault,
      };
    });
  }, [rawSites, user]);

  const managedCount = sites.filter((site) => site.hasManager).length;

  if (!user) return null;

  const run = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const addLocationHref = billedLocked ? "/business/plans" : "/business/locations/new";

  const saveLocation = (site: HomeSite) =>
    run(async () => {
      const latitude = Number(editForm.latitude);
      const longitude = Number(editForm.longitude);
      const hasCoordinates = Number.isFinite(latitude) && Number.isFinite(longitude);
      if (!isVirtualHqSiteId(site.id)) {
        await updateBusinessSite(site.id, {
          siteName: editForm.tradingName,
          address: editForm.address,
          postcode: editForm.postCode,
          ...(hasCoordinates ? { latitude, longitude } : {}),
        });
      }
      if (hasCoordinates) {
        await updateBusinessOrganisationCoordinates(user.organisationId, { latitude, longitude });
      }
      setEditingId(null);
      setNotice("Location updated.");
      await loadSites();
    });

  const managedLine = sitesLoading
    ? "Loading sites…"
    : sites.length === 0
      ? "No locations yet"
      : `${managedCount} of ${sites.length} ${sites.length === 1 ? "site" : "sites"} managed`;

  return (
    <PortalPageShell className="!space-y-3 sm:!space-y-3">
      <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="min-w-0">
            <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">Your sites</h1>
            <p className="mt-1.5 truncate font-saveful text-xs text-gray-500">
              {user.organization}
              {user.address ? (
                <>
                  <span className="text-gray-300"> · </span>
                  {user.address}
                </>
              ) : null}
              <span className="text-gray-300"> · </span>
              {managedLine}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/business/insights" className={headerBtn}>
              <BarChart3 className="h-3.5 w-3.5" />
              Insights
            </Link>
            <Link href={addLocationHref} className={headerBtn}>
              <Plus className="h-3.5 w-3.5" />
              Add location
            </Link>
            <Link
              href={billedLocked ? "/business/plans" : "/business/listings/new"}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
            >
              Create listing
            </Link>
          </div>
        </header>

        <div className="space-y-3 p-4 sm:p-5">
          {entitlements && billedLocked ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 font-saveful text-xs text-amber-900">
              {statusLabel(entitlements.status)}
              {entitlements.planDisplayName ? ` · ${entitlements.planDisplayName}` : ""}
              {" — listings and extra sites stay locked until you start a trial or choose a plan."}
            </p>
          ) : null}
          {error ? <p className="rounded-lg bg-amber-50 px-3 py-2 font-saveful text-xs text-amber-800">{error}</p> : null}
          {notice ? (
            <p className="rounded-lg bg-saveful-green/10 px-3 py-2 font-saveful text-xs text-saveful-green">{notice}</p>
          ) : null}

          <section className="overflow-hidden rounded-xl border border-gray-200">
            <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
                <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">Directory</h2>
                <span className="truncate font-saveful text-[11px] text-gray-400">
                  Head office operates the default site
                </span>
              </div>
            </div>

            {sitesLoading ? (
              <div className="flex flex-col items-center justify-center px-3.5 py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-[#E8E2D6] border-t-saveful-green" />
                <p className="mt-3 font-saveful text-sm text-gray-500">Loading your sites…</p>
              </div>
            ) : sites.length === 0 ? (
              <div className="px-3.5 py-8 text-center">
                <p className="font-saveful-semibold text-sm text-gray-900">No locations yet</p>
                <p className="mt-1 font-saveful text-sm text-gray-500">
                  Your head-office site is created automatically so you can list surplus from HQ.
                </p>
                <Button className="mt-3" size="sm" href={addLocationHref}>
                  Add location
                </Button>
              </div>
            ) : (
              <div className="space-y-1.5 p-2">
                {sites.map((site, index) => {
                  const open = expandedId === site.id;
                  const editing = editingId === site.id;
                  return (
                    <article
                      key={site.id}
                      className={cn(
                        "rounded-xl transition-colors",
                        open ? "bg-[#F7F6F2] ring-1 ring-black/[0.05]" : "hover:bg-[#F7F6F2]/80",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedId(open ? null : site.id);
                          setEditingId(null);
                        }}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left"
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                            open ? "bg-white text-saveful-green shadow-sm" : "bg-[#F7F6F2] text-saveful-green",
                          )}
                        >
                          <Building2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="font-saveful-semibold text-sm text-gray-900">{site.tradingName}</p>
                            {site.isDefault ? <StatusBadge tone="blue">HQ</StatusBadge> : (
                              <span className="font-saveful text-[11px] text-gray-400">Site {index + 1}</span>
                            )}
                            {isVirtualHqSiteId(site.id) ? <StatusBadge tone="amber">Preview</StatusBadge> : null}
                            <StatusBadge tone={site.hasManager ? "green" : "amber"}>
                              {site.hasManager ? "Managed" : "Needs manager"}
                            </StatusBadge>
                          </div>
                          <p className="mt-0.5 truncate font-saveful text-xs text-gray-500">
                            {[site.address, site.postCode].filter(Boolean).join(" · ") ||
                              "Address from your organisation"}
                          </p>
                        </div>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-gray-400 transition-transform",
                            open && "rotate-180",
                          )}
                        />
                      </button>

                      {open ? (
                        <div className="mx-2 mb-2 rounded-xl border border-black/[0.04] bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-4">
                          {editing ? (
                            <div className="space-y-3">
                              <label className="block">
                                <span className="mb-1.5 block font-saveful-semibold text-xs text-gray-700">
                                  Location name
                                </span>
                                <input
                                  value={editForm.tradingName}
                                  onChange={(event) =>
                                    setEditForm((current) => ({ ...current, tradingName: event.target.value }))
                                  }
                                  className={fieldClass}
                                />
                              </label>
                              <div>
                                <p className="mb-1.5 font-saveful-semibold text-xs text-gray-700">Address / location</p>
                                <AddressPicker
                                  value={{
                                    address: editForm.address,
                                    postcode: editForm.postCode,
                                    lat: editForm.latitude,
                                    lon: editForm.longitude,
                                  }}
                                  onChange={(next) =>
                                    setEditForm({
                                      tradingName: editForm.tradingName,
                                      address: next.address,
                                      postCode: next.postcode,
                                      latitude: next.lat,
                                      longitude: next.lon,
                                    })
                                  }
                                  compact
                                />
                              </div>
                              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                {site.isDefault ? (
                                  <p className="font-saveful text-xs text-gray-500">
                                    Default head-office site can’t be removed.
                                  </p>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => {
                                      if (!window.confirm("Delete this location?")) return;
                                      void run(async () => {
                                        await deleteBusinessSite(site.id);
                                        setExpandedId(null);
                                        setNotice("Site removed.");
                                        await loadSites();
                                      });
                                    }}
                                    className="font-saveful-semibold text-xs text-red-600 hover:text-red-700"
                                  >
                                    Delete location
                                  </button>
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                    Cancel
                                  </Button>
                                  <Button size="sm" disabled={busy} onClick={() => void saveLocation(site)}>
                                    {busy ? "Saving…" : "Save changes"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div className="flex items-start gap-3">
                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-saveful-green/10 font-saveful-bold text-sm text-saveful-green">
                                  {initialsFromName(site.contactName)}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-400">
                                    Site manager
                                  </p>
                                  <p className="mt-0.5 font-saveful-semibold text-sm text-gray-900">
                                    {site.contactName}
                                  </p>
                                  <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                                    <p className="flex min-w-0 items-center gap-2 font-saveful text-sm text-gray-600">
                                      <Mail className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                      <span className="truncate">{site.email}</span>
                                    </p>
                                    <p className="flex min-w-0 items-center gap-2 font-saveful text-sm text-gray-600">
                                      <Phone className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                                      <span className="truncate">{site.mobile}</span>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {site.isDefault ? (
                                <p className="rounded-lg bg-[#F7F6F2] px-3 py-2 font-saveful text-xs text-gray-500">
                                  Head office operates this default site. Listing requires a plan.
                                </p>
                              ) : null}

                              <div className="flex flex-col-reverse gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                {site.hasManager && site.managerId && !site.isDefault ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!window.confirm("Remove this manager from the site?")) return;
                                      void run(async () => {
                                        await removeSiteAccess(site.id, site.managerId!);
                                        setNotice("Manager removed from this site.");
                                        await loadSites();
                                      });
                                    }}
                                    className="self-start font-saveful-semibold text-xs text-red-600 hover:text-red-700"
                                  >
                                    Remove manager
                                  </button>
                                ) : (
                                  <span />
                                )}
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setEditingId(site.id);
                                      setEditForm({
                                        tradingName: site.tradingName,
                                        address: site.address,
                                        postCode: site.postCode,
                                        latitude: site.latitude ?? NaN,
                                        longitude: site.longitude ?? NaN,
                                      });
                                    }}
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    Edit site
                                  </Button>
                                  {!isVirtualHqSiteId(site.id) && !site.isDefault ? (
                                    <Button
                                      size="sm"
                                      href={
                                        billedLocked
                                          ? "/business/plans"
                                          : `/business/locations/new?mode=manager&siteId=${site.id}`
                                      }
                                    >
                                      <Users className="h-3.5 w-3.5" />
                                      {site.hasManager ? "Update manager" : "Assign manager"}
                                    </Button>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </section>
    </PortalPageShell>
  );
}
