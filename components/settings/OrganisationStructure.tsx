"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, X } from "lucide-react";
import { AdminRowMenu } from "@/components/admin/AdminChrome";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { Button } from "@/components/ui/button";
import { useSession } from "@/lib/auth";
import { refreshEnterpriseStructure } from "@/lib/enterpriseLive";
import {
  canDeleteUnit,
  deactivateUnit,
  deleteUnit,
  hasHistoricalData,
  listActiveUnits,
  listUnits,
  reactivateUnit,
  saveUnit,
  sitesAssignedTo,
  sitesHref,
  structureLabel,
  useOrgStructureVersion,
  type OrgStructureKind,
  type OrgStructureUnit,
} from "@/lib/orgStructure";
import { structurePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const TABS: { id: OrgStructureKind; label: string; description: string }[] = [
  {
    id: "group",
    label: "Groups",
    description:
      "Groups can be used to organise sites by business unit, sector or another structure that makes sense for your organisation.",
  },
  {
    id: "territory",
    label: "Territories",
    description:
      "Territories are independent geographic labels. They are not children of Groups, and sites do not need both.",
  },
  {
    id: "cluster",
    label: "Clusters",
    description:
      "Clusters are independent labels for local groupings. They are not children of Groups or Territories.",
  },
];

const PAGE_SIZES = [10, 25, 50] as const;

type Dialog =
  | { type: "form"; unit?: OrgStructureUnit }
  | { type: "deactivate"; unit: OrgStructureUnit }
  | { type: "delete"; unit: OrgStructureUnit }
  | null;

function parseTab(value: string | null): OrgStructureKind {
  if (value === "territory" || value === "territories") return "territory";
  if (value === "cluster" || value === "clusters") return "cluster";
  return "group";
}

export function OrganisationStructure() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const user = useSession();
  const permissions = structurePermissions(user);
  const structureVersion = useOrgStructureVersion();

  const kind = parseTab(searchParams.get("tab"));
  const tab = TABS.find((item) => item.id === kind) ?? TABS[0];
  const [query, setQuery] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(10);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [actionError, setActionError] = useState("");
  const [loading, setLoading] = useState(
    () => !listUnits("group").length && !listUnits("territory").length && !listUnits("cluster").length,
  );

  useEffect(() => {
    let cancelled = false;
    void refreshEnterpriseStructure()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return listUnits(kind)
      .filter((unit) => {
        if (!needle) return true;
        return `${unit.name} ${unit.code} ${unit.description}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name) * (sortDir === "asc" ? 1 : -1));
  }, [kind, query, sortDir, structureVersion]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const paged = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const from = rows.length ? (currentPage - 1) * pageSize + 1 : 0;
  const to = Math.min(currentPage * pageSize, rows.length);

  const setTab = (next: OrgStructureKind) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "group") params.delete("tab");
    else params.set("tab", next === "territory" ? "territories" : "clusters");
    const suffix = params.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    setQuery("");
    setPage(1);
    setMenuId(null);
    setDialog(null);
  };

  return (
    <SettingsWorkspace
      title="Organisation Structure"
      description="Set up how your sites are organised across your Enterprise."
    >
      <section className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
        <div className="flex gap-5 overflow-x-auto border-b border-gray-100 px-4 sm:px-5">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                "-mb-px border-b-2 py-3 font-saveful-semibold text-sm whitespace-nowrap transition",
                kind === item.id
                  ? "border-saveful-green text-gray-900"
                  : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          <p className="max-w-3xl font-saveful text-sm leading-relaxed text-gray-600">{tab.description}</p>
          {actionError ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-saveful text-sm text-amber-800">
              {actionError}
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="relative block min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
                placeholder={`Search ${tab.label}`}
                className="h-10 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] pl-10 pr-3 font-saveful text-sm outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white"
              />
            </label>
            {permissions.add ? (
              <Button
                className="w-full sm:w-auto"
                onClick={() => {
                  setMenuId(null);
                  setDialog({ type: "form" });
                }}
              >
                <Plus className="h-4 w-4" />
                Add {structureLabel(kind)}
              </Button>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-left">
              <thead className="bg-[#F7F6F2]">
                <tr className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-saveful">
                    <button
                      type="button"
                      onClick={() => setSortDir((current) => (current === "asc" ? "desc" : "asc"))}
                      className="inline-flex items-center gap-1 hover:text-gray-800"
                    >
                      {structureLabel(kind)}
                      <span className="text-gray-400">{sortDir === "asc" ? "↑" : "↓"}</span>
                    </button>
                  </th>
                  <th className="px-3 py-3 font-saveful">Code</th>
                  <th className="px-3 py-3 font-saveful">Sites</th>
                  <th className="px-3 py-3 font-saveful">Status</th>
                  <th className="px-3 py-3 font-saveful"> </th>
                </tr>
              </thead>
              <tbody>
                {paged.map((unit) => {
                  const sites = sitesAssignedTo(kind, unit.id);
                  return (
                    <tr key={unit.id} className="border-t border-gray-100">
                      <td className="px-4 py-3">
                        <p className="font-saveful-semibold text-sm text-gray-900">{unit.name}</p>
                        {unit.description ? (
                          <p className="mt-0.5 max-w-md truncate font-saveful text-xs text-gray-500">
                            {unit.description}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-saveful text-sm text-gray-600">{unit.code || "—"}</td>
                      <td className="px-3 py-3">
                        <Link
                          href={sitesHref(kind, unit.id)}
                          className="font-saveful-semibold text-sm text-saveful-green hover:underline"
                        >
                          {sites.length}
                        </Link>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 font-saveful text-sm text-gray-800">
                          <span
                            className={cn(
                              "h-2 w-2 rounded-full",
                              unit.status === "active" ? "bg-saveful-green" : "border border-gray-400",
                            )}
                          />
                          {unit.status === "active" ? "Active" : "Deactivated"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right">
                        {permissions.edit || permissions.deactivate ? (
                          <RowMenu
                            kind={kind}
                            unit={unit}
                            open={menuId === unit.id}
                            canEdit={permissions.edit}
                            canDeactivate={permissions.deactivate}
                            canRemove={permissions.remove && canDeleteUnit(kind, unit.id)}
                            onOpenChange={(next) => setMenuId(next ? unit.id : null)}
                            onEdit={() => {
                              setMenuId(null);
                              setDialog({ type: "form", unit });
                            }}
                            onDeactivate={() => {
                              setMenuId(null);
                              setDialog({ type: "deactivate", unit });
                            }}
                            onReactivate={async () => {
                              setMenuId(null);
                              setActionError("");
                              const result = await reactivateUnit(kind, unit.id, user?.name || "Enterprise user");
                              if (!result.ok) {
                                setActionError(result.error);
                                return;
                              }
                              void refreshEnterpriseStructure();
                            }}
                            onDelete={() => {
                              setMenuId(null);
                              setDialog({ type: "delete", unit });
                            }}
                          />
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loading && rows.length === 0 ? (
              <p className="px-4 py-8 text-center font-saveful text-sm text-gray-500">Loading {tab.label.toLowerCase()}…</p>
            ) : rows.length === 0 ? (
              <p className="px-4 py-8 text-center font-saveful text-sm text-gray-500">
                No {tab.label.toLowerCase()} match this search.
              </p>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 font-saveful text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              Showing {from} to {to} of {rows.length} {tab.label.toLowerCase()}
            </p>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2">
                Rows per page
                <select
                  value={pageSize}
                  onChange={(event) => {
                    setPageSize(Number(event.target.value) as 10 | 25 | 50);
                    setPage(1);
                  }}
                  className="h-8 rounded-lg border border-black/[0.06] bg-white px-2"
                >
                  {PAGE_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex items-center gap-1">
                <PageButton disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>
                  ‹
                </PageButton>
                <span className="min-w-8 px-2 text-center text-gray-800">{currentPage}</span>
                <PageButton disabled={currentPage >= pageCount} onClick={() => setPage(currentPage + 1)}>
                  ›
                </PageButton>
              </div>
            </div>
          </div>
        </div>
      </section>

      {dialog?.type === "form" ? (
        <StructureFormDialog
          kind={kind}
          unit={dialog.unit}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog?.type === "deactivate" ? (
        <DeactivateDialog kind={kind} unit={dialog.unit} onClose={() => setDialog(null)} />
      ) : null}
      {dialog?.type === "delete" ? (
        <DeleteDialog kind={kind} unit={dialog.unit} onClose={() => setDialog(null)} />
      ) : null}
    </SettingsWorkspace>
  );
}

function RowMenu({
  kind,
  unit,
  open,
  canEdit,
  canDeactivate,
  canRemove,
  onOpenChange,
  onEdit,
  onDeactivate,
  onReactivate,
  onDelete,
}: {
  kind: OrgStructureKind;
  unit: OrgStructureUnit;
  open: boolean;
  canEdit: boolean;
  canDeactivate: boolean;
  canRemove: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
}) {
  return (
    <AdminRowMenu label={`${unit.name} actions`} open={open} onOpenChange={onOpenChange}>
      {canEdit ? (
        <button type="button" className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]" onClick={onEdit}>
          Edit {structureLabel(kind).toLowerCase()}
        </button>
      ) : null}
      {canDeactivate && unit.status === "active" ? (
        <button type="button" className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]" onClick={onDeactivate}>
          Deactivate
        </button>
      ) : null}
      {canDeactivate && unit.status === "deactivated" ? (
        <button type="button" className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]" onClick={onReactivate}>
          Reactivate
        </button>
      ) : null}
      {canRemove ? (
        <button type="button" className="block w-full px-3 py-2 text-left font-saveful text-sm text-red-600 hover:bg-red-50" onClick={onDelete}>
          Delete
        </button>
      ) : hasHistoricalData(kind, unit.id) ? (
        <p className="px-3 py-2 font-saveful text-[11px] leading-relaxed text-gray-400">
          Has historical collections. Deactivate instead of deleting.
        </p>
      ) : null}
    </AdminRowMenu>
  );
}

function StructureFormDialog({
  kind,
  unit,
  onClose,
}: {
  kind: OrgStructureKind;
  unit?: OrgStructureUnit;
  onClose: () => void;
}) {
  const user = useSession();
  const label = structureLabel(kind);
  const [name, setName] = useState(unit?.name ?? "");
  const [code, setCode] = useState(unit?.code ?? "");
  const [description, setDescription] = useState(unit?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const result = await saveUnit(
        kind,
        { name, code, description },
        unit?.id,
        user?.name || "Enterprise user",
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      void refreshEnterpriseStructure();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={unit ? `Edit ${label}` : `Add ${label}`} onClose={onClose}>
      <div className="space-y-4">
        <Field label={`${label} name *`}>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`Enter ${label.toLowerCase()} name`}
            className={fieldClass}
          />
        </Field>
        <Field label={`${label} code`}>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Enter code (optional)"
            className={fieldClass}
          />
        </Field>
        <Field label="Description (optional)">
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 250))}
            placeholder="Enter description"
            rows={4}
            className={cn(fieldClass, "min-h-24 py-2.5")}
          />
          <p className="mt-1 text-right font-saveful text-[11px] text-gray-400">{description.length} / 250</p>
        </Field>
        {error ? <p className="font-saveful text-sm text-amber-700">{error}</p> : null}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saving} onClick={() => void submit()}>
          {saving ? "Saving…" : unit ? "Save changes" : `Add ${label}`}
        </Button>
      </div>
    </Modal>
  );
}

function DeactivateDialog({
  kind,
  unit,
  onClose,
}: {
  kind: OrgStructureKind;
  unit: OrgStructureUnit;
  onClose: () => void;
}) {
  const label = structureLabel(kind);
  const affected = sitesAssignedTo(kind, unit.id);
  const alternatives = listActiveUnits(kind).filter((item) => item.id !== unit.id);
  const user = useSession();
  const [nextBySite, setNextBySite] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const ready = affected.every((site) => Boolean(nextBySite[site.id]));

  const submit = async () => {
    setError("");
    setSaving(true);
    try {
      const result = await deactivateUnit(
        kind,
        unit.id,
        affected.map((site) => ({
          siteId: site.id,
          nextId: nextBySite[site.id] === "unassigned" ? null : nextBySite[site.id] ?? null,
        })),
        user?.name || "Enterprise user",
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onClose();
      void refreshEnterpriseStructure();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={`Deactivate ${label}`} onClose={onClose} wide={affected.length > 0}>
      {affected.length ? (
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3">
            <p className="font-saveful-semibold text-sm text-gray-900">
              {affected.length} {affected.length === 1 ? "site is" : "sites are"} assigned to {unit.name}.
            </p>
            <p className="mt-1 font-saveful text-xs leading-relaxed text-gray-600">
              Deactivating this {label.toLowerCase()} will not deactivate those sites. Reassign each one first.
              Past collections keep the {label.toLowerCase()} they had at the time.
            </p>
          </div>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {affected.map((site) => (
              <div
                key={site.id}
                className="flex flex-col gap-2 rounded-xl border border-gray-100 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-saveful-semibold text-sm text-gray-900">{site.name}</p>
                  <p className="font-saveful text-xs text-gray-500">{site.siteCode}</p>
                </div>
                <select
                  value={nextBySite[site.id] ?? ""}
                  onChange={(event) =>
                    setNextBySite((current) => ({ ...current, [site.id]: event.target.value }))
                  }
                  className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm sm:w-56"
                >
                  <option value="" disabled>
                    Reassign to…
                  </option>
                  <option value="unassigned">Unassigned</option>
                  {alternatives.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="font-saveful text-sm leading-relaxed text-gray-600">
          No current sites use {unit.name}. Deactivating it hides it from new assignments. Historical
          collections keep this {label.toLowerCase()}.
        </p>
      )}
      {error ? <p className="mt-3 font-saveful text-sm text-amber-700">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={saving || (affected.length > 0 && !ready)} onClick={() => void submit()}>
          {saving ? "Saving…" : `Deactivate ${label}`}
        </Button>
      </div>
    </Modal>
  );
}

function DeleteDialog({
  kind,
  unit,
  onClose,
}: {
  kind: OrgStructureKind;
  unit: OrgStructureUnit;
  onClose: () => void;
}) {
  const user = useSession();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={`Delete ${structureLabel(kind)}`} onClose={onClose}>
      <p className="font-saveful text-sm leading-relaxed text-gray-600">
        {kind === "group"
          ? `${unit.name} can be removed only if it has no clusters and no assigned sites.`
          : `${unit.name} has no assigned sites and no historical collections, so it can be removed.`}
      </p>
      {error ? <p className="mt-3 font-saveful text-sm text-amber-700">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={saving}
          onClick={async () => {
            setError("");
            setSaving(true);
            try {
              const result = await deleteUnit(kind, unit.id, user?.name || "Enterprise user");
              if (!result.ok) {
                setError(result.error);
                return;
              }
              onClose();
              void refreshEnterpriseStructure();
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </Modal>
  );
}

function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div
        className={cn(
          "w-full rounded-2xl border border-black/[0.05] bg-white p-5 shadow-xl",
          wide ? "max-w-xl" : "max-w-md",
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="font-saveful-bold text-lg text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-[#F7F6F2] hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">{label}</span>
      {children}
    </label>
  );
}

const fieldClass =
  "h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white";

function PageButton({
  children,
  disabled,
  onClick,
}: {
  children: string;
  disabled?: boolean;
  onClick: () => void;
}) {
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
