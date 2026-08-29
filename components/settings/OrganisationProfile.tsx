"use client";

import { useRef, useState, type ReactNode } from "react";
import { ImagePlus, Info, Lock } from "lucide-react";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { formatEnterpriseId } from "@/lib/admin";
import { appendAudit, formatAuditChanges } from "@/lib/audit";
import { useSession } from "@/lib/auth";
import { formatDisplayDate } from "@/lib/dates";
import {
  ORG_COUNTRIES,
  ORG_CURRENCIES,
  ORG_TIMEZONES,
  ORG_UNITS,
  editableFrom,
  getOrganization,
  saveOrganization,
  useOrganizationVersion,
  type EditableOrganization,
  type OrgCurrency,
  type OrgUnits,
} from "@/lib/organization";
import { canEditOrganization } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const inputClass =
  "h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40 focus:bg-white disabled:cursor-not-allowed disabled:bg-[#F3F2EE] disabled:text-gray-500";

export function OrganisationProfile() {
  return (
    <SettingsWorkspace
      title="Organisation Profile"
      description="Manage your Enterprise details and account information."
    >
      <OrganisationProfileForm />
    </SettingsWorkspace>
  );
}

function OrganisationProfileForm() {
  const user = useSession();
  useOrganizationVersion();
  const canEdit = canEditOrganization(user);
  const saved = getOrganization();
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState<EditableOrganization>(() => editableFrom(saved));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const update = <K extends keyof EditableOrganization>(key: K, value: EditableOrganization[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setNotice("");
    setError("");
  };

  const cancel = () => {
    setDraft(editableFrom(getOrganization()));
    setNotice("");
    setError("");
  };

  const save = () => {
    if (!canEdit) return;
    if (!draft.name.trim()) {
      setError("Enterprise name is required.");
      return;
    }
    if (draft.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.contactEmail.trim())) {
      setError("Enter a valid primary contact email.");
      return;
    }
    const result = saveOrganization({
      ...draft,
      name: draft.name.trim(),
      contactName: draft.contactName.trim(),
      contactEmail: draft.contactEmail.trim(),
      contactPhone: draft.contactPhone.trim(),
    });
    setDraft(editableFrom(result.organization));
    if (!result.changes.length) {
      setNotice("No changes to save.");
      return;
    }
    appendAudit({
      actor: user?.name || "Enterprise user",
      action: "Updated organisation profile",
      area: "settings",
      entity: result.organization.name,
      detail: formatAuditChanges(result.changes),
      changes: result.changes,
    });
    setError("");
    setNotice("Organisation details saved.");
  };

  const onLogo = (file: File | undefined) => {
    if (!file || !canEdit) return;
    if (!["image/png", "image/jpeg"].includes(file.type)) {
      setError("Logo must be a PNG or JPG file.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Logo must be 2 MB or smaller.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      update("logoDataUrl", typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Organisation details">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Enterprise name" required className="sm:col-span-1">
              <input
                value={draft.name}
                onChange={(event) => update("name", event.target.value)}
                disabled={!canEdit}
                className={inputClass}
              />
            </Field>
            <Field label="Enterprise ID" hint="Enterprise ID cannot be changed.">
              <input value={formatEnterpriseId(saved.enterpriseId) || saved.enterpriseId} readOnly disabled className={inputClass} />
            </Field>
            <Field label="Primary contact name" className="sm:col-span-2">
              <input
                value={draft.contactName}
                onChange={(event) => update("contactName", event.target.value)}
                disabled={!canEdit}
                className={inputClass}
              />
            </Field>
            <Field label="Primary contact email" className="sm:col-span-2">
              <input
                type="email"
                value={draft.contactEmail}
                onChange={(event) => update("contactEmail", event.target.value)}
                disabled={!canEdit}
                className={inputClass}
              />
            </Field>
            <Field label="Primary contact phone" className="sm:col-span-2">
              <input
                value={draft.contactPhone}
                onChange={(event) => update("contactPhone", event.target.value)}
                disabled={!canEdit}
                className={inputClass}
              />
            </Field>
          </div>
        </Card>

        <Card title="Organisation logo">
          <div className="flex h-40 items-center justify-center rounded-xl border border-gray-100 bg-[#F7F6F2]">
            {draft.logoDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={draft.logoDataUrl} alt={`${draft.name} logo`} className="max-h-32 max-w-full object-contain" />
            ) : (
              <p className="font-saveful-semibold text-lg tracking-[0.18em] text-gray-400">{draft.name}</p>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(event) => {
              onLogo(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {canEdit ? (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
            >
              <ImagePlus className="h-3.5 w-3.5" />
              Change logo
            </button>
          ) : null}
          <p className="mt-2 font-saveful text-xs text-gray-500">
            PNG or JPG. Recommended minimum size: 400 × 400 px. Used on reports and in the portal header.
          </p>
        </Card>

        <Card title="Location & reporting">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Country">
              <select
                value={draft.country}
                onChange={(event) => update("country", event.target.value)}
                disabled={!canEdit}
                className={inputClass}
              >
                {ORG_COUNTRIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Timezone">
              <select
                value={draft.timezone}
                onChange={(event) => update("timezone", event.target.value)}
                disabled={!canEdit}
                className={inputClass}
              >
                {ORG_TIMEZONES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Currency">
              <select
                value={draft.currency}
                onChange={(event) => update("currency", event.target.value as OrgCurrency)}
                disabled={!canEdit}
                className={inputClass}
              >
                {ORG_CURRENCIES.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Measurement units">
              <select
                value={draft.units}
                onChange={(event) => update("units", event.target.value as OrgUnits)}
                disabled={!canEdit}
                className={inputClass}
              >
                {ORG_UNITS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="mt-4 flex gap-2 rounded-xl bg-saveful-green/[0.06] px-3 py-2.5">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
            <p className="font-saveful text-xs leading-relaxed text-gray-600">
              These settings determine how dates, times, currencies and measurements are displayed in the portal and
              reports.
            </p>
          </div>
        </Card>

        <Card
          title="Account information"
          action={<Lock className="h-3.5 w-3.5 text-gray-400" />}
        >
          <dl className="divide-y divide-gray-100">
            <ReadOnly label="Account status" value={saved.accountStatus} />
            <ReadOnly label="Contract start date" value={formatDisplayDate(saved.contractStart, "long")} />
            <ReadOnly label="Contract end date" value={formatDisplayDate(saved.contractEnd, "long")} />
            <ReadOnly label="Billing frequency" value={saved.billingFrequency} />
            <ReadOnly label="Enterprise plan" value={saved.plan} />
          </dl>
          <p className="mt-3 font-saveful text-xs text-gray-500">
            Provisioning details are managed by Saveful and are read-only in this portal.
          </p>
        </Card>
      </div>

      {!canEdit ? (
        <p className="font-saveful text-xs text-gray-500">
          Organisation details can only be changed by an authorised Enterprise administrator.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-end gap-3">
          {error ? <p className="mr-auto font-saveful text-xs text-red-600">{error}</p> : null}
          {notice ? <p className="mr-auto font-saveful text-xs text-saveful-green">{notice}</p> : null}
          <button
            type="button"
            onClick={cancel}
            className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3.5 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
          >
            Save changes
          </button>
        </div>
      )}
    </>
  );
}

function Card({
  title,
  action,
  children,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <h3 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h3>
        {action}
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block font-saveful text-[11px] text-gray-400">{hint}</span> : null}
    </label>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[10.5rem_1fr] gap-3 py-2.5">
      <dt className="font-saveful text-xs text-gray-500">{label}</dt>
      <dd className="font-saveful-semibold text-sm text-gray-900">{value}</dd>
    </div>
  );
}
