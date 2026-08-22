"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CircleHelp } from "lucide-react";
import { AddressPicker } from "@/components/sites/AddressPicker";
import { PortalShell } from "@/components/layout/PortalShell";
import { PortalPageShell } from "@/components/ui/Portal";
import { listUsers, useUsersVersion } from "@/lib/users";
import { listActiveUnits, useOrgStructureVersion } from "@/lib/orgStructure";
import {
  TIME_OPTIONS,
  WEEKDAYS,
  emptySiteForm,
  isSiteCodeTaken,
  siteToFormValues,
  type SiteFormValues,
} from "@/lib/siteForm";
import type { OrganizationSite } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const inputClass =
  "h-10 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white disabled:opacity-50";

type FieldKey =
  | "siteName"
  | "siteCode"
  | "address"
  | "inviteFirstName"
  | "inviteLastName"
  | "inviteEmail"
  | "existingUserId";

export function SiteForm({
  mode,
  site,
}: {
  mode: "create" | "edit";
  site?: OrganizationSite;
}) {
  const router = useRouter();
  useOrgStructureVersion();
  const [values, setValues] = useState<SiteFormValues>(site ? siteToFormValues(site) : emptySiteForm());
  useUsersVersion();
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const cancelHref = site ? `/sites/${site.id}` : "/sites";

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
    if (!values.siteName.trim()) next.siteName = "Please enter a site name.";
    if (!values.place.address.trim()) next.address = "Please search or enter a pickup address.";
    if (values.siteCode.trim() && isSiteCodeTaken(values.siteCode, site?.id)) {
      next.siteCode = "This Site ID is already used in your organisation.";
    }
    if (values.adminMode === "invite") {
      if (!values.inviteFirstName.trim()) next.inviteFirstName = "Please enter a first name.";
      if (!values.inviteLastName.trim()) next.inviteLastName = "Please enter a last name.";
      if (!values.inviteEmail.trim()) next.inviteEmail = "Please enter an email so we can send the invitation.";
    }
    if (values.adminMode === "existing" && !values.existingUserId) {
      next.existingUserId = "Select a user or choose another option.";
    }
    return next;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    window.setTimeout(() => router.push(site ? `/sites/${site.id}` : "/sites"), 400);
  };

  const inviting = values.adminMode === "invite";
  const submitLabel = saving ? "Saving…" : inviting ? "Save site & send invitation" : "Save site";

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href="/sites" className="hover:text-saveful-green">
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

        <form onSubmit={handleSubmit} className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
                {mode === "create" ? "Add site" : "Edit site"}
              </h1>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                {mode === "create"
                  ? "Add a location to your Enterprise network."
                  : "Group, territory and cluster changes apply going forward only."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={cancelHref}
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white disabled:opacity-60"
              >
                {submitLabel}
              </button>
            </div>
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            <FormSection title="1. Site details">
              <div className="space-y-4 p-3.5">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <Field label="Site name" htmlFor="siteName" required error={errors.siteName}>
                    <input
                      id="siteName"
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
                    label="Site ID / Code"
                    htmlFor="siteCode"
                    hint="Unique internal identifier for this organisation."
                    error={errors.siteCode}
                  >
                    <input
                      id="siteCode"
                      value={values.siteCode}
                      onChange={(event) => {
                        update("siteCode", event.target.value);
                        clearError("siteCode");
                      }}
                      placeholder="e.g. PC001"
                      className={inputClass}
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
                  <Field label="Primary contact" htmlFor="contactName">
                    <input
                      id="contactName"
                      value={values.contactName}
                      onChange={(event) => update("contactName", event.target.value)}
                      placeholder="e.g. Sarah Williams"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Email" htmlFor="contactEmail">
                    <input
                      id="contactEmail"
                      type="email"
                      value={values.contactEmail}
                      onChange={(event) => update("contactEmail", event.target.value)}
                      placeholder="name@organisation.com"
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Phone" htmlFor="contactPhone">
                    <input
                      id="contactPhone"
                      type="tel"
                      value={values.contactPhone}
                      onChange={(event) => update("contactPhone", event.target.value)}
                      placeholder="e.g. 0412 345 678"
                      className={inputClass}
                    />
                  </Field>
                </div>
              </div>
            </FormSection>

            <FormSection title="2. Enterprise structure" hint="Optional · managed in Settings">
              <div className="grid grid-cols-1 gap-3 p-3.5 md:grid-cols-3">
                <StructureField
                  label="Group"
                  hint="Changing this does not rewrite past collections."
                  value={values.groupId}
                  options={listActiveUnits("group")}
                  onChange={(groupId) => update("groupId", groupId)}
                />
                <StructureField
                  label="Territory"
                  hint="Independent label. Not a child of Group."
                  value={values.territoryId}
                  options={listActiveUnits("territory")}
                  onChange={(territoryId) => update("territoryId", territoryId)}
                />
                <StructureField
                  label="Cluster"
                  hint="Create new clusters in Structure settings."
                  value={values.clusterId}
                  options={listActiveUnits("cluster")}
                  onChange={(clusterId) => update("clusterId", clusterId)}
                />
              </div>
            </FormSection>

            <FormSection title="3. Collection information" hint="Defaults for new listings">
              <div className="space-y-4 p-3.5">
                <div>
                  <p className="mb-2 font-saveful text-xs text-gray-500">Days available</p>
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
                  <Field label="From" htmlFor="collectionFrom">
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
                  <Field label="To" htmlFor="collectionTo">
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

                <Field label="Collection instructions" htmlFor="collectionInstructions">
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
                </Field>
              </div>
            </FormSection>

            <FormSection title="4. Site Admin" hint="Optional">
              <div className="space-y-2 p-3.5">
                <div className="flex flex-wrap gap-1.5">
                  {(
                    [
                      ["invite", "Invite new user"],
                      ["existing", "Existing user"],
                      ["later", "Assign later"],
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
                  <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                    <Field label="First name" htmlFor="inviteFirstName" error={errors.inviteFirstName}>
                      <input
                        id="inviteFirstName"
                        value={values.inviteFirstName}
                        onChange={(event) => {
                          update("inviteFirstName", event.target.value);
                          clearError("inviteFirstName");
                        }}
                        placeholder="e.g. Michael"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Last name" htmlFor="inviteLastName" error={errors.inviteLastName}>
                      <input
                        id="inviteLastName"
                        value={values.inviteLastName}
                        onChange={(event) => {
                          update("inviteLastName", event.target.value);
                          clearError("inviteLastName");
                        }}
                        placeholder="e.g. Jones"
                        className={inputClass}
                      />
                    </Field>
                    <Field label="Email" htmlFor="inviteEmail" error={errors.inviteEmail}>
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
                    <Field label="Mobile" htmlFor="inviteMobile">
                      <input
                        id="inviteMobile"
                        type="tel"
                        value={values.inviteMobile}
                        onChange={(event) => update("inviteMobile", event.target.value)}
                        placeholder="e.g. 0412 345 678"
                        className={inputClass}
                      />
                    </Field>
                    <p className="font-saveful text-xs text-gray-500 sm:col-span-2">
                      They create their own password through the invitation email.
                    </p>
                  </div>
                ) : null}

                {values.adminMode === "existing" ? (
                  <div className="pt-1">
                    <select
                      value={values.existingUserId}
                      onChange={(event) => {
                        update("existingUserId", event.target.value);
                        clearError("existingUserId");
                      }}
                      className={inputClass}
                    >
                      <option value="">Select a user</option>
                      {listUsers()
                        .filter((user) => user.status === "active")
                        .map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name} · {user.email}
                        </option>
                      ))}
                    </select>
                    {errors.existingUserId ? (
                      <p className="mt-1.5 font-saveful text-xs text-red-600">{errors.existingUserId}</p>
                    ) : null}
                  </div>
                ) : null}

                {values.adminMode === "later" ? (
                  <p className="font-saveful text-xs text-gray-500">
                    You can invite a Site Admin from Users & Access after the site is saved.
                  </p>
                ) : null}
              </div>
            </FormSection>
          </div>
        </form>
      </PortalPageShell>
    </PortalShell>
  );
}

function FormSection({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <span className="h-3.5 w-1 rounded-full bg-saveful-green" aria-hidden />
        <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
        {hint ? <span className="truncate font-saveful text-[11px] text-gray-400">{hint}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Field({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 flex items-center gap-1.5 font-saveful text-xs text-gray-500">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
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
