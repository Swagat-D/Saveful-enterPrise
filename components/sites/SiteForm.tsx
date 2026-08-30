"use client";

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp, LoaderCircle } from "lucide-react";
import { AddressPicker } from "@/components/sites/AddressPicker";
import { AdminPortalShell } from "@/components/layout/AdminPortalShell";
import { PortalShell } from "@/components/layout/PortalShell";
import { PortalPageShell } from "@/components/ui/Portal";
import { listUsers, useUsersVersion } from "@/lib/users";
import { listActiveUnits, useOrgStructureVersion } from "@/lib/orgStructure";
import {
  ApiError,
  assignAdminSiteAdmin,
  assignExistingSiteAdmin,
  createAdminOrganisationSite,
  createOrganisationSite,
  getAdminEnterpriseStructure,
  getEnterprise,
  getOrganisationSiteDetails,
  inviteAdminEnterpriseUser,
  listAdminEnterpriseUsers,
  inviteEnterpriseUser,
  updateOrganisationSite,
} from "@/lib/api";
import {
  adminFiltersToQuery,
  lastAdminFilters,
  listLiveEnterprises,
  formatEnterpriseId,
  recordCreatedAdminSite,
  refreshOrganisations,
  refreshSites,
  useAdminVersion,
} from "@/lib/admin";
import { useSession } from "@/lib/auth";
import { refreshEnterpriseWorkspace, siteFromApiRow } from "@/lib/enterpriseLive";
import {
  TIME_OPTIONS,
  WEEKDAYS,
  clearSiteFormDraft,
  contactFromSiteAdmin,
  emptySiteForm,
  loadSiteFormDraft,
  saveSiteFormDraft,
  siteFormToApiInput,
  siteToFormValues,
  type SiteFormValues,
} from "@/lib/siteForm";
import type { OrganizationSite } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white disabled:opacity-50";

type FieldKey =
  | "organisationId"
  | "siteName"
  | "address"
  | "inviteFirstName"
  | "inviteLastName"
  | "inviteEmail"
  | "inviteMobile"
  | "existingUserId";

type AssignableUser = { id: string; name: string; email: string; mobile?: string; role?: string; status?: string };
type StructureOption = { id: string; name: string };

function initialAdminOrganisationId(preferred?: string) {
  if (preferred && /^\d+$/.test(preferred)) return preferred;
  const remembered = lastAdminFilters().organisationId;
  return remembered !== "all" && /^\d+$/.test(remembered) ? remembered : "";
}

export function SiteForm({
  mode,
  site,
  variant = "enterprise",
  defaultOrganisationId,
}: {
  mode: "create" | "edit";
  site?: OrganizationSite;
  variant?: "enterprise" | "admin";
  defaultOrganisationId?: string;
}) {
  const router = useRouter();
  const user = useSession();
  const isAdmin = variant === "admin";
  useOrgStructureVersion();
  const usersVersion = useUsersVersion();
  useAdminVersion();
  const [values, setValues] = useState<SiteFormValues>(site ? siteToFormValues(site) : emptySiteForm());
  const [liveSite, setLiveSite] = useState<OrganizationSite | undefined>(site);
  const draftAppliedRef = useRef(false);
  const [organisationId, setOrganisationId] = useState(initialAdminOrganisationId(defaultOrganisationId));
  const [adminUsers, setAdminUsers] = useState<AssignableUser[]>([]);
  const [adminUnits, setAdminUnits] = useState<{ group: StructureOption[]; territory: StructureOption[]; cluster: StructureOption[] }>({
    group: [],
    territory: [],
    cluster: [],
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState("");
  const [draftNotice, setDraftNotice] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdSiteId, setCreatedSiteId] = useState<number | null>(site ? Number(site.id) : null);
  const [assignedSiteCode, setAssignedSiteCode] = useState(site?.siteCode ?? "");
  const adminQuery = adminFiltersToQuery(lastAdminFilters());
  const cancelHref = isAdmin ? `/admin/sites${adminQuery}` : site ? `/sites/${site.id}` : "/sites";
  const organisations = isAdmin ? listLiveEnterprises() : [];
  const enterpriseUsers = listUsers()
    .filter((item) => item.status === "active" && /^\d+$/.test(item.id))
    .map((item) => ({
      id: item.id,
      name: item.name,
      email: item.email,
      mobile: item.mobile,
      role: item.role,
      status: item.status,
    }));
  const assignableUsers = isAdmin ? adminUsers : enterpriseUsers;
  const structureUnits = {
    group: isAdmin ? adminUnits.group : listActiveUnits("group"),
    territory: isAdmin ? adminUnits.territory : listActiveUnits("territory"),
    cluster: isAdmin ? adminUnits.cluster : listActiveUnits("cluster"),
  };

  useEffect(() => {
    if (!isAdmin) return;
    void refreshOrganisations().catch(() => undefined);
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    if (!organisationId) {
      setAdminUsers([]);
      setAdminUnits({ group: [], territory: [], cluster: [] });
      return;
    }
    let cancelled = false;
    const mapMembers = (members: Array<{ id: number; firstName: string; lastName: string; email: string; mobile?: string | null; roleLabel?: string; role?: string; status?: string }>) =>
      members.map((member) => ({
        id: String(member.id),
        name: `${member.firstName} ${member.lastName}`.trim() || member.email,
        email: member.email,
        mobile: member.mobile ?? "",
        role: member.roleLabel || member.role,
        status: member.status,
      }));

    listAdminEnterpriseUsers(organisationId)
      .then((payload) => {
        if (cancelled) return;
        setAdminUsers(mapMembers(payload.users ?? []));
      })
      .catch(() =>
        getEnterprise(organisationId)
          .then((detail) => {
            if (cancelled) return;
            setAdminUsers(mapMembers(detail.users ?? []));
          })
          .catch(() => {
            if (!cancelled) setAdminUsers([]);
          }),
      );

    getAdminEnterpriseStructure(organisationId)
      .then((structure) => {
        if (cancelled) return;
        setAdminUnits({
          group: structure.groups.filter((item) => item.isActive).map((item) => ({ id: String(item.id), name: item.name })),
          cluster: (
            structure.clusters ??
            structure.groups.flatMap((group) => group.clusters ?? [])
          )
            .filter((item) => item.isActive)
            .map((item) => ({ id: String(item.id), name: item.name })),
          territory: structure.territories
            .filter((item) => item.isActive)
            .map((item) => ({ id: String(item.id), name: item.name })),
        });
      })
      .catch(() => {
        if (!cancelled) setAdminUnits({ group: [], territory: [], cluster: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [isAdmin, organisationId]);

  useEffect(() => {
    if (mode !== "edit" || !site || isAdmin) return;
    let cancelled = false;
    getOrganisationSiteDetails(Number(site.id))
      .then((detail) => {
        if (cancelled) return;
        const next = siteFromApiRow({
          ...detail.site,
          managers: detail.managers ?? detail.site.managers,
        });
        setLiveSite(next);
        if (!draftAppliedRef.current) setValues(siteToFormValues(next));
      })
      .catch(() => {
        if (!cancelled) setLiveSite(site);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin, mode, site]);

  useEffect(() => {
    if (mode !== "edit" || !liveSite || draftAppliedRef.current) return;
    const next = siteToFormValues(liveSite);
    setValues((prev) => {
      if (!prev.existingUserId && next.existingUserId) {
        return { ...prev, adminMode: "existing", existingUserId: next.existingUserId };
      }
      if (!prev.inviteFirstName && !prev.inviteEmail && (next.inviteFirstName || next.inviteEmail)) {
        return {
          ...prev,
          inviteFirstName: next.inviteFirstName,
          inviteLastName: next.inviteLastName,
          inviteEmail: next.inviteEmail,
          inviteMobile: next.inviteMobile,
        };
      }
      return prev;
    });
  }, [liveSite, mode, usersVersion]);

  useEffect(() => {
    const variant = isAdmin ? "admin" : "enterprise";
    const siteId = mode === "edit" ? site?.id : undefined;
    if (mode === "edit" && !siteId) return;
    if (mode === "create" && site) return;
    const draft = loadSiteFormDraft(variant, siteId);
    if (!draft) return;
    draftAppliedRef.current = true;
    setValues(draft.values);
    if (draft.organisationId && /^\d+$/.test(draft.organisationId)) {
      setOrganisationId(draft.organisationId);
    }
    setDraftNotice("Restored your saved draft.");
  }, [isAdmin, mode, site]);

  const update = <K extends keyof SiteFormValues>(key: K, value: SiteFormValues[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
  };

  const clearError = (key: FieldKey) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (isAdmin && !organisationId) next.organisationId = "Select the Enterprise this site belongs to.";
    if (!values.siteName.trim()) next.siteName = "Please enter a site name.";
    if (!values.place.address.trim()) next.address = "Please search or pin a pickup address.";
    if (!Number.isFinite(values.place.lat) || !Number.isFinite(values.place.lon)) {
      next.address = "Choose an address from search or use your location so we can save coordinates.";
    }
    if (values.adminMode === "invite") {
      if (!values.inviteFirstName.trim()) next.inviteFirstName = "Please enter a first name.";
      if (!values.inviteLastName.trim()) next.inviteLastName = "Please enter a last name.";
      if (!values.inviteEmail.trim()) next.inviteEmail = "Please enter an email so we can send the invitation.";
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.inviteEmail.trim())) {
        next.inviteEmail = "Please enter a valid email address.";
      }
      if (!values.inviteMobile.trim()) next.inviteMobile = "Please enter a mobile number.";
      else if (!/\d{6,}/.test(values.inviteMobile.replace(/\D/g, ""))) {
        next.inviteMobile = "Please enter a valid mobile number.";
      }
    }
    if (values.adminMode === "existing" && !values.existingUserId) {
      next.existingUserId = "Select a Site Admin so this site can be used.";
    }
    if (values.adminMode === "existing" && values.existingUserId) {
      const selected = assignableUsers.find((item) => item.id === values.existingUserId);
      if (selected && !String(selected.mobile ?? "").replace(/\D/g, "")) {
        next.existingUserId = "This user has no mobile number. Choose someone else or invite a new Site Admin.";
      }
    }
    return next;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    setFormError("");
    let savedSiteId = createdSiteId;
    try {
      const payload = siteFormToApiInput(values, {
        clearUnassigned: mode === "edit" || Boolean(createdSiteId),
      });
      const selectedAdmin = assignableUsers.find((item) => item.id === values.existingUserId);
      if (values.adminMode === "existing" && selectedAdmin) {
        payload.contactName = selectedAdmin.name.slice(0, 120);
        payload.contactEmail = selectedAdmin.email.toLowerCase();
        if (selectedAdmin.mobile) payload.phoneNumber = selectedAdmin.mobile.slice(0, 30);
      }
      const saved = savedSiteId
        ? isAdmin
          ? { site: { id: savedSiteId, siteName: values.siteName.trim(), address: values.place.address.trim(), siteCode: assignedSiteCode } }
          : await updateOrganisationSite(savedSiteId, payload)
        : isAdmin
          ? await createAdminOrganisationSite(organisationId, payload)
          : await createOrganisationSite(payload);
      savedSiteId = saved.site.id;
      setCreatedSiteId(savedSiteId);
      if (saved.site.siteCode) setAssignedSiteCode(saved.site.siteCode);

      const currentEmail = (liveSite?.email || site?.email || "").trim().toLowerCase();
      const currentManagerId = liveSite?.managerUserId || site?.managerUserId || "";

      if (values.adminMode === "invite") {
        const nextEmail = values.inviteEmail.trim().toLowerCase();
        const sameContact = Boolean(currentEmail && nextEmail === currentEmail);
        if (!sameContact) {
          const invite = {
            firstName: values.inviteFirstName.trim(),
            lastName: values.inviteLastName.trim(),
            email: nextEmail,
            mobile: values.inviteMobile.trim(),
            role: "SITE_ADMIN",
            siteAdminForSiteId: savedSiteId,
            scopes: [{ scopeType: "SITE", scopeId: savedSiteId }],
          };
          if (isAdmin) await inviteAdminEnterpriseUser(organisationId, invite);
          else await inviteEnterpriseUser(invite);
        }
      }

      if (values.adminMode === "existing" && values.existingUserId !== currentManagerId) {
        if (isAdmin) await assignAdminSiteAdmin(organisationId, savedSiteId, Number(values.existingUserId));
        else await assignExistingSiteAdmin(savedSiteId, Number(values.existingUserId));
      }

      if (isAdmin) {
        recordCreatedAdminSite(
          {
            id: String(savedSiteId),
            orgId: organisationId,
            name: saved.site.siteName || values.siteName.trim(),
            address: saved.site.address || values.place.address.trim(),
            siteCode: saved.site.siteCode ?? undefined,
          },
          { name: user?.name ?? "Saveful Admin", email: user?.email ?? "" },
        );
        await refreshSites().catch(() => undefined);
        clearSiteFormDraft("admin", mode === "edit" ? String(savedSiteId) : undefined);
        router.push(mode === "edit" ? `/admin/sites${adminQuery}` : `/admin/sites/${savedSiteId}${adminQuery}`);
      } else {
        await refreshEnterpriseWorkspace();
        clearSiteFormDraft("enterprise", mode === "edit" ? String(savedSiteId) : undefined);
        router.push(mode === "edit" ? "/sites" : `/sites/${savedSiteId}`);
      }
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "The site could not be saved. Please try again.";
      setFormError(
        savedSiteId && !createdSiteId
          ? `Site saved. ${message} You can retry the Site Admin step without creating another site.`
          : message,
      );
      if (!isAdmin) await refreshEnterpriseWorkspace().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  };

  const persistDraft = async () => {
    if (draftSaving) return;
    setDraftSaving(true);
    setFormError("");
    setDraftNotice("");
    try {
      await new Promise((resolve) => window.setTimeout(resolve, 400));
      saveSiteFormDraft(
        isAdmin ? "admin" : "enterprise",
        values,
        isAdmin ? organisationId : undefined,
        mode === "edit" ? site?.id ?? liveSite?.id : undefined,
      );
      draftAppliedRef.current = true;
      setDraftNotice(
        isAdmin
          ? "Draft saved. You can leave this page and come back — your details will be waiting."
          : "Draft saved. You can leave this page or open Structure settings, then return here.",
      );
    } catch {
      setFormError("Draft could not be saved. Check that browser storage is available and try again.");
    } finally {
      setDraftSaving(false);
    }
  };

  const openStructureSettings = async () => {
    await persistDraft();
    router.push("/settings/structure");
  };

  const siteContact =
    values.adminMode === "existing"
      ? (() => {
          const selected = assignableUsers.find((item) => item.id === values.existingUserId);
          return selected
            ? { name: selected.name, email: selected.email, mobile: selected.mobile ?? "" }
            : null;
        })()
      : contactFromSiteAdmin(values);
  const inviting = values.adminMode === "invite";
  const submitLabel = saving ? "Saving…" : inviting ? "Save site & send invitation" : "Save site";
  const Shell = isAdmin ? AdminPortalShell : PortalShell;
  const selectedEnterprise = organisations.find((org) => org.id === organisationId);

  return (
    <Shell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href={isAdmin ? `/admin/sites${adminQuery}` : "/sites"} className="hover:text-saveful-green">
            Sites
          </Link>
          {site ? (
            <>
              <span className="px-1.5 text-gray-300">/</span>
              <Link href={`/sites/${site.id}`} className="hover:text-saveful-green">
                {site.name}
              </Link>
            </>
          ) : null}
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">{mode === "create" ? "Add site" : "Edit"}</span>
        </nav>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:px-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
                {mode === "create" ? "Add site" : "Edit site"}
              </h1>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                {mode === "create"
                  ? isAdmin
                    ? "Create a site under a selected Enterprise. The same fields and invitation flow as Super Admin."
                    : "Add a location to your Enterprise network."
                  : "Group, territory and cluster changes apply going forward only."}
              </p>
            </div>
            <FormActions
              cancelHref={cancelHref}
              submitLabel={submitLabel}
              saving={saving}
              draftSaving={draftSaving}
              draftSaved={Boolean(draftNotice)}
              onSaveDraft={persistDraft}
            />
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            {formError ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-saveful text-sm text-red-700">
                {formError}
              </p>
            ) : null}
            {draftNotice ? (
              <p className="rounded-lg border border-saveful-green/20 bg-saveful-green/[0.06] px-3 py-2 font-saveful text-sm text-saveful-green">
                {draftNotice}
              </p>
            ) : null}
            <p className="font-saveful text-xs text-gray-500">
              Fields marked <span className="font-saveful-semibold text-red-500">*</span> are required. Everything else is optional.
            </p>
            <FormSection title="1. Site details">
              <div className="space-y-4 p-3.5">
                {isAdmin ? (
                  <Field label="Enterprise" htmlFor="organisationId" required error={errors.organisationId}>
                    <select
                      id="organisationId"
                      value={organisationId}
                      onChange={(event) => {
                        setOrganisationId(event.target.value);
                        update("groupId", "");
                        update("territoryId", "");
                        update("clusterId", "");
                        update("existingUserId", "");
                        clearError("organisationId");
                      }}
                      className={inputClass}
                    >
                      <option value="">Select an Enterprise</option>
                      {organisations.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                          {org.enterpriseId ? ` · ${formatEnterpriseId(org.enterpriseId)}` : ""}
                        </option>
                      ))}
                    </select>
                    {selectedEnterprise ? (
                      <p className="mt-1.5 font-saveful text-xs text-gray-500">
                        The site will be created under {selectedEnterprise.name}.
                      </p>
                    ) : null}
                  </Field>
                ) : null}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Site name" htmlFor="siteName" required error={errors.siteName}>
                    <input
                      id="siteName"
                      maxLength={160}
                      value={values.siteName}
                      onChange={(event) => {
                        update("siteName", event.target.value);
                        clearError("siteName");
                      }}
                      placeholder="e.g. Perth College"
                      className={inputClass}
                    />
                  </Field>
                  <Field
                    label="Site ID"
                    htmlFor="siteCode"
                    hint="Created automatically when the site is saved."
                    optional
                  >
                    <input
                      id="siteCode"
                      readOnly
                      value={assignedSiteCode || "Assigned on save"}
                      className={cn(inputClass, "text-gray-500")}
                    />
                  </Field>
                </div>

                <Field label="Address" htmlFor="address" required>
                  <AddressPicker
                    compact
                    value={values.place}
                    error={errors.address}
                    onChange={(place) => {
                      update("place", place);
                      if (place.address) clearError("address");
                    }}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Field label="Postcode" htmlFor="postcode" optional>
                    <input
                      id="postcode"
                      maxLength={20}
                      value={values.place.postcode}
                      onChange={(event) =>
                        update("place", { ...values.place, postcode: event.target.value })
                      }
                      placeholder="e.g. 6000"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Latitude" htmlFor="latitude" required>
                    <input
                      id="latitude"
                      readOnly
                      value={Number.isFinite(values.place.lat) ? values.place.lat.toFixed(6) : ""}
                      className={cn(inputClass, "text-gray-500")}
                    />
                  </Field>
                  <Field label="Longitude" htmlFor="longitude" required>
                    <input
                      id="longitude"
                      readOnly
                      value={Number.isFinite(values.place.lon) ? values.place.lon.toFixed(6) : ""}
                      className={cn(inputClass, "text-gray-500")}
                    />
                  </Field>
                </div>
              </div>
            </FormSection>

            <FormSection title="2. Site Admin" hint="Required · this person is the site contact">
              <div className="space-y-3 p-3.5">
                <p className="font-saveful text-xs text-gray-500">
                  A Site Admin is required. Without one, nobody can operate this site.
                </p>
                {mode === "edit" && (liveSite?.managerName || liveSite?.email || liveSite?.mobile) ? (
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-black/[0.04] bg-[#F7F6F2] px-3.5 py-3 sm:grid-cols-3">
                    <ContactPreview label="Current name" value={liveSite.managerName || liveSite.primaryContact || "—"} />
                    <ContactPreview label="Current email" value={liveSite.email || "—"} />
                    <ContactPreview label="Current mobile" value={liveSite.mobile || "—"} />
                  </div>
                ) : null}
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["invite", "Invite new user"],
                      ["existing", "Existing user"],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => update("adminMode", id)}
                      className={cn(
                        "h-8 rounded-lg px-3 font-saveful-semibold text-xs transition",
                        values.adminMode === id
                          ? "bg-saveful-green text-white"
                          : "bg-[#F7F6F2] text-gray-600 hover:bg-[#EFEDE6]",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {values.adminMode === "invite" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="First name" htmlFor="inviteFirstName" required error={errors.inviteFirstName}>
                      <input
                        id="inviteFirstName"
                        maxLength={80}
                        value={values.inviteFirstName}
                        onChange={(event) => {
                          update("inviteFirstName", event.target.value);
                          clearError("inviteFirstName");
                        }}
                        placeholder="e.g. Michael"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Last name" htmlFor="inviteLastName" required error={errors.inviteLastName}>
                      <input
                        id="inviteLastName"
                        maxLength={80}
                        value={values.inviteLastName}
                        onChange={(event) => {
                          update("inviteLastName", event.target.value);
                          clearError("inviteLastName");
                        }}
                        placeholder="e.g. Jones"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Email" htmlFor="inviteEmail" required error={errors.inviteEmail}>
                      <input
                        id="inviteEmail"
                        type="email"
                        value={values.inviteEmail}
                        onChange={(event) => {
                          update("inviteEmail", event.target.value);
                          clearError("inviteEmail");
                        }}
                        placeholder="name@organisation.com"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Mobile" htmlFor="inviteMobile" required error={errors.inviteMobile}>
                      <input
                        id="inviteMobile"
                        type="tel"
                        maxLength={30}
                        value={values.inviteMobile}
                        onChange={(event) => {
                          update("inviteMobile", event.target.value);
                          clearError("inviteMobile");
                        }}
                        placeholder="e.g. 0412 345 678"
                        className={inputClass}
                      />
                    </Field>
                    <p className="font-saveful text-xs text-gray-500 sm:col-span-2">
                      These details are saved as the site contact. They set their own password from the invitation email.
                    </p>
                  </div>
                ) : null}

                {values.adminMode === "existing" ? (
                  <div className="space-y-3">
                    <Field label="User" htmlFor="existingUserId" required error={errors.existingUserId}>
                      <select
                        id="existingUserId"
                        value={values.existingUserId}
                        onChange={(event) => {
                          update("existingUserId", event.target.value);
                          clearError("existingUserId");
                        }}
                        className={inputClass}
                      >
                        <option value="">Select a user</option>
                        {assignableUsers.map((member) => (
                          <option key={member.id} value={member.id} disabled={member.status === "DEACTIVATED"}>
                            {member.name} · {member.email}
                            {member.role ? ` · ${member.role}` : ""}
                            {member.status && member.status !== "ACTIVE" ? ` · ${member.status.toLowerCase()}` : ""}
                          </option>
                        ))}
                      </select>
                      {isAdmin && !organisationId ? (
                        <p className="mt-1.5 font-saveful text-xs text-gray-500">
                          Select an Enterprise first to see its users.
                        </p>
                      ) : null}
                      {isAdmin && organisationId && assignableUsers.length === 0 ? (
                        <p className="mt-1.5 font-saveful text-xs text-gray-500">
                          No users in this Enterprise yet. Invite a new Site Admin instead.
                        </p>
                      ) : null}
                    </Field>
                    {siteContact ? (
                      <div className="grid grid-cols-1 gap-3 rounded-xl bg-[#F7F6F2] px-3.5 py-3 sm:grid-cols-3">
                        <ContactPreview label="Name" value={siteContact.name} />
                        <ContactPreview label="Email" value={siteContact.email} />
                        <ContactPreview label="Mobile" value={siteContact.mobile} />
                      </div>
                    ) : (
                      <p className="font-saveful text-xs text-gray-500">
                        Their name, email and mobile become the site contact.
                      </p>
                    )}
                  </div>
                ) : null}
              </div>
            </FormSection>

            <FormSection title="3. Enterprise structure" optional hint="Managed in Settings">
              <div className="space-y-3 p-3.5">
              <p className="font-saveful text-xs text-gray-500">
                Save a draft if you need to set up groups, territories or clusters first.
                {!isAdmin ? (
                  <>
                    {" "}
                    <button
                      type="button"
                      onClick={openStructureSettings}
                      className="font-saveful-semibold text-saveful-green hover:underline"
                    >
                      Open structure settings
                    </button>
                  </>
                ) : null}
              </p>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <StructureField
                  label="Group"
                  hint="Changing this does not rewrite past collections."
                  value={values.groupId}
                  options={structureUnits.group}
                  onChange={(groupId) => update("groupId", groupId)}
                />
                <StructureField
                  label="Territory"
                  hint="Independent label. Not a child of Group."
                  value={values.territoryId}
                  options={structureUnits.territory}
                  onChange={(territoryId) => update("territoryId", territoryId)}
                />
                <StructureField
                  label="Cluster"
                  hint="Independent label. Changing this does not rewrite past collections."
                  value={values.clusterId}
                  options={structureUnits.cluster}
                  onChange={(clusterId) => update("clusterId", clusterId)}
                />
              </div>
              </div>
            </FormSection>

            <FormSection
              title="4. Collection information"
              optional
              hint="Defaults for new listings, and can be changed within each listing"
            >
              <div className="space-y-4 p-3.5">
                <div>
                  <p className="mb-2 flex items-center gap-1.5 font-saveful text-xs text-gray-500">
                    Days available
                    <span className="font-saveful text-[11px] text-gray-400">Optional</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {WEEKDAYS.map((day) => {
                      const checked = values.collectionDays.includes(day.id);
                      return (
                        <button
                          key={day.id}
                          type="button"
                          onClick={() =>
                            update(
                              "collectionDays",
                              checked
                                ? values.collectionDays.filter((item) => item !== day.id)
                                : [...values.collectionDays, day.id],
                            )
                          }
                          className={cn(
                            "h-8 rounded-lg px-2.5 font-saveful-semibold text-xs transition",
                            checked
                              ? "bg-saveful-green text-white"
                              : "bg-[#F7F6F2] text-gray-600 hover:bg-[#EFEDE6]",
                          )}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Collection start" htmlFor="collectionFrom" optional>
                    <select
                      id="collectionFrom"
                      value={values.collectionFrom}
                      onChange={(event) => update("collectionFrom", event.target.value)}
                      className={inputClass}
                    >
                      {TIME_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Collection end" htmlFor="collectionTo" optional>
                    <select
                      id="collectionTo"
                      value={values.collectionTo}
                      onChange={(event) => update("collectionTo", event.target.value)}
                      className={inputClass}
                    >
                      {TIME_OPTIONS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                <Field label="General collection instructions" htmlFor="collectionInstructions" optional>
                  <div className="relative">
                    <textarea
                      id="collectionInstructions"
                      value={values.collectionInstructions}
                      maxLength={500}
                      rows={3}
                      onChange={(event) => update("collectionInstructions", event.target.value)}
                      placeholder="e.g. Enter via rear loading dock. Ask for kitchen manager."
                      className="w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 py-2.5 font-saveful text-sm outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white"
                    />
                    <p className="absolute bottom-2 right-3 font-saveful text-[11px] text-gray-400">
                      {values.collectionInstructions.length} / 500
                    </p>
                  </div>
                  <p className="mt-1.5 font-saveful text-xs text-gray-500">
                    Specific listing instructions can be added on each listing.
                  </p>
                </Field>
              </div>
            </FormSection>
          </div>

          <footer className="sticky bottom-0 z-10 border-t border-gray-100 bg-white/95 px-4 py-3 backdrop-blur sm:px-5">
            {draftNotice ? (
              <p className="mb-2 font-saveful text-xs text-saveful-green xl:hidden">{draftNotice}</p>
            ) : null}
            <FormActions
              cancelHref={cancelHref}
              submitLabel={submitLabel}
              saving={saving}
              draftSaving={draftSaving}
              draftSaved={Boolean(draftNotice)}
              onSaveDraft={persistDraft}
            />
          </footer>
        </form>
      </PortalPageShell>
    </Shell>
  );
}

function FormActions({
  cancelHref,
  submitLabel,
  saving,
  draftSaving,
  draftSaved,
  onSaveDraft,
}: {
  cancelHref: string;
  submitLabel: string;
  saving: boolean;
  draftSaving?: boolean;
  draftSaved?: boolean;
  onSaveDraft?: () => void;
}) {
  const draftLabel = draftSaving ? "Saving draft…" : draftSaved ? "Draft saved" : "Save as draft";
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-2 xl:w-auto xl:shrink-0">
      <Link
        href={cancelHref}
        className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
      >
        Cancel
      </Link>
      {onSaveDraft ? (
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={draftSaving || saving}
          aria-busy={draftSaving}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 font-saveful-semibold text-sm disabled:opacity-60",
            draftSaved && !draftSaving
              ? "border-saveful-green/30 bg-saveful-green/[0.08] text-saveful-green"
              : "border-black/[0.06] bg-white text-gray-800 hover:bg-[#F7F6F2]",
          )}
        >
          {draftSaving ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : null}
          {draftLabel}
        </button>
      ) : null}
      <button
        type="submit"
        disabled={saving || draftSaving}
        className="inline-flex h-9 min-w-0 items-center justify-center rounded-lg bg-saveful-green px-3.5 text-center font-saveful-semibold text-sm text-white disabled:opacity-60"
      >
        {submitLabel}
      </button>
    </div>
  );
}

function FormSection({
  title,
  hint,
  optional,
  children,
}: {
  title: string;
  hint?: string;
  optional?: boolean;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
        <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
        {optional ? (
          <span className="rounded-full bg-white px-2 py-0.5 font-saveful text-[10px] uppercase tracking-wide text-gray-500">
            Optional
          </span>
        ) : (
          <span className="rounded-full bg-saveful-green/10 px-2 py-0.5 font-saveful text-[10px] uppercase tracking-wide text-saveful-green">
            Required
          </span>
        )}
        {hint ? <span className="min-w-0 font-saveful text-[11px] leading-snug text-gray-400">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function ContactPreview({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-400">{label}</p>
      <p className="mt-1 truncate font-saveful text-sm text-gray-800">{value || "—"}</p>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  required,
  optional,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  optional?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 flex items-center gap-1.5 font-saveful text-xs text-gray-500">
        {label}
        {required ? <span className="font-saveful-semibold text-red-500">*</span> : null}
        {optional ? <span className="font-saveful text-[11px] text-gray-400">Optional</span> : null}
        {hint ? (
          <span title={hint} className="text-gray-400">
            <CircleHelp className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </label>
      {children}
      {error ? <p className="mt-1 font-saveful text-xs text-red-600">{error}</p> : null}
    </div>
  );
}

function StructureField({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint: string;
  value: string;
  options: { id: string; name: string }[];
  onChange: (value: string) => void;
}) {
  const unassigned = !value;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 font-saveful text-xs text-gray-500">
          {label}
          <span className="font-saveful text-[11px] text-gray-400">Optional</span>
          <span title={hint} className="text-gray-400">
            <CircleHelp className="h-3.5 w-3.5" />
          </span>
        </p>
        <button
          type="button"
          onClick={() => onChange(unassigned ? options[0]?.id ?? "" : "")}
          className="font-saveful text-[11px] text-saveful-green hover:underline"
        >
          {unassigned ? "Assign" : "Clear"}
        </button>
      </div>
      <select
        value={value}
        disabled={unassigned}
        onChange={(event) => onChange(event.target.value)}
        className={inputClass}
      >
        <option value="">{unassigned ? "Not assigned" : `Select ${label}`}</option>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
    </div>
  );
}
