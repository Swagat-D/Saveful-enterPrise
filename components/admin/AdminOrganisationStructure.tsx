"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Plus, Search, X } from "lucide-react";
import { AdminRowMenu } from "@/components/admin/AdminChrome";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  createAdminEnterpriseStructure,
  deactivateAdminEnterpriseStructure,
  deleteAdminEnterpriseStructure,
  getAdminEnterpriseStructure,
  reactivateAdminEnterpriseStructure,
  updateAdminEnterpriseStructure,
  type AdminStructureKind,
  type EnterpriseStructureUnit,
} from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS: { id: AdminStructureKind; label: string; description: string }[] = [
  {
    id: "groups",
    label: "Groups",
    description:
      "Groups organise sites by business unit, sector, or another structure that makes sense for this Enterprise.",
  },
  {
    id: "territories",
    label: "Territories",
    description:
      "Territories are independent geographic labels for sites. They are not the country shown in the organisation header.",
  },
  {
    id: "clusters",
    label: "Clusters",
    description: "Clusters are independent labels for local groupings of sites.",
  },
];

type Dialog =
  | { type: "form"; unit?: EnterpriseStructureUnit }
  | { type: "deactivate"; unit: EnterpriseStructureUnit }
  | { type: "delete"; unit: EnterpriseStructureUnit }
  | null;

function kindLabel(kind: AdminStructureKind) {
  return TABS.find((tab) => tab.id === kind)?.label.slice(0, -1) ?? "Structure";
}

function structureError(err: unknown, fallback: string) {
  if (err instanceof ApiError) return err.message || fallback;
  return err instanceof Error ? err.message : fallback;
}

export function AdminOrganisationStructure({
  organisationId,
  query,
}: {
  organisationId: string;
  query: string;
}) {
  const [kind, setKind] = useState<AdminStructureKind>("groups");
  const [rows, setRows] = useState<EnterpriseStructureUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [actionError, setActionError] = useState("");

  const load = async () => {
    const payload = await getAdminEnterpriseStructure(organisationId);
    const next =
      kind === "groups" ? payload.groups : kind === "territories" ? payload.territories : payload.clusters ?? [];
    setRows(next ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void load()
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when org or tab changes
  }, [organisationId, kind]);

  const tab = TABS.find((item) => item.id === kind) ?? TABS[0];
  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows
      .filter((unit) => {
        if (!needle) return true;
        return `${unit.name} ${unit.code ?? ""} ${unit.description ?? ""}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows, search]);

  return (
    <div className="space-y-4">
      <p className="max-w-3xl font-saveful text-sm leading-relaxed text-gray-600">
        Add and edit how this Enterprise organises its sites. Assign a group, territory, or cluster when you create or
        edit a site.
      </p>

      <div className="overflow-hidden rounded-xl border border-gray-200">
        <div className="flex gap-5 overflow-x-auto border-b border-gray-100 px-4">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setKind(item.id);
                setSearch("");
                setMenuId(null);
                setActionError("");
              }}
              className={cn(
                "-mb-px border-b-2 py-2.5 font-saveful-semibold text-sm whitespace-nowrap",
                kind === item.id ? "border-saveful-green text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="space-y-4 p-4">
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
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={`Search ${tab.label}`}
                className="h-10 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] pl-10 pr-3 font-saveful text-sm outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white"
              />
            </label>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                setMenuId(null);
                setDialog({ type: "form" });
              }}
            >
              <Plus className="h-4 w-4" />
              Add {kindLabel(kind)}
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="min-w-full text-left">
              <thead className="bg-[#F7F6F2]">
                <tr className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                  <th className="px-4 py-3 font-saveful">{kindLabel(kind)}</th>
                  <th className="px-3 py-3 font-saveful">Code</th>
                  <th className="px-3 py-3 font-saveful">Sites</th>
                  <th className="px-3 py-3 font-saveful">Status</th>
                  <th className="px-3 py-3 font-saveful"> </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((unit) => (
                  <tr key={unit.id} className="border-t border-gray-100">
                    <td className="px-4 py-3">
                      <p className="font-saveful-semibold text-sm text-gray-900">{unit.name}</p>
                      {unit.description ? (
                        <p className="mt-0.5 max-w-md truncate font-saveful text-xs text-gray-500">{unit.description}</p>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 font-saveful text-sm text-gray-600">{unit.code || "—"}</td>
                    <td className="px-3 py-3">
                      <Link
                        href={`/admin/sites${query}`}
                        className="font-saveful-semibold text-sm text-saveful-green hover:underline"
                      >
                        {unit.siteCount ?? 0}
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex items-center gap-1.5 font-saveful text-sm text-gray-800">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            unit.isActive ? "bg-saveful-green" : "border border-gray-400",
                          )}
                        />
                        {unit.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <AdminRowMenu
                        label={`${unit.name} actions`}
                        open={menuId === unit.id}
                        onOpenChange={(open) => setMenuId(open ? unit.id : null)}
                      >
                        <button
                          type="button"
                          className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
                          onClick={() => {
                            setMenuId(null);
                            setDialog({ type: "form", unit });
                          }}
                        >
                          Edit {kindLabel(kind).toLowerCase()}
                        </button>
                        {unit.isActive ? (
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
                            onClick={() => {
                              setMenuId(null);
                              setDialog({ type: "deactivate", unit });
                            }}
                          >
                            Deactivate
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left font-saveful text-sm hover:bg-[#F7F6F2]"
                            onClick={async () => {
                              setMenuId(null);
                              setActionError("");
                              try {
                                await reactivateAdminEnterpriseStructure(organisationId, kind, unit.id);
                                await load();
                              } catch (err) {
                                setActionError(structureError(err, "Could not reactivate this structure."));
                              }
                            }}
                          >
                            Reactivate
                          </button>
                        )}
                        {(unit.siteCount ?? 0) === 0 ? (
                          <button
                            type="button"
                            className="block w-full px-3 py-2 text-left font-saveful text-sm text-red-600 hover:bg-red-50"
                            onClick={() => {
                              setMenuId(null);
                              setDialog({ type: "delete", unit });
                            }}
                          >
                            Delete
                          </button>
                        ) : null}
                      </AdminRowMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loading && filtered.length === 0 ? (
              <p className="px-4 py-8 text-center font-saveful text-sm text-gray-500">Loading {tab.label.toLowerCase()}…</p>
            ) : filtered.length === 0 ? (
              <p className="px-4 py-8 text-center font-saveful text-sm text-gray-500">
                No {tab.label.toLowerCase()} yet. Add one to use it on sites.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {dialog?.type === "form" ? (
        <StructureFormDialog
          organisationId={organisationId}
          kind={kind}
          unit={dialog.unit}
          onClose={() => setDialog(null)}
          onSaved={async () => {
            setDialog(null);
            await load();
          }}
        />
      ) : null}
      {dialog?.type === "deactivate" ? (
        <ConfirmDialog
          title={`Deactivate ${kindLabel(kind)}`}
          body={`${dialog.unit.name} will be hidden from new site assignments. Existing sites stay assigned and keep reporting.`}
          confirmLabel={`Deactivate ${kindLabel(kind)}`}
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await deactivateAdminEnterpriseStructure(organisationId, kind, dialog.unit.id);
            setDialog(null);
            await load();
          }}
        />
      ) : null}
      {dialog?.type === "delete" ? (
        <ConfirmDialog
          title={`Delete ${kindLabel(kind)}`}
          body={`${dialog.unit.name} has no assigned sites, so it can be removed.`}
          confirmLabel="Delete"
          danger
          onClose={() => setDialog(null)}
          onConfirm={async () => {
            await deleteAdminEnterpriseStructure(organisationId, kind, dialog.unit.id);
            setDialog(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}

function StructureFormDialog({
  organisationId,
  kind,
  unit,
  onClose,
  onSaved,
}: {
  organisationId: string;
  kind: AdminStructureKind;
  unit?: EnterpriseStructureUnit;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const label = kindLabel(kind);
  const [name, setName] = useState(unit?.name ?? "");
  const [code, setCode] = useState(unit?.code ?? "");
  const [description, setDescription] = useState(unit?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError(`${label} name is required.`);
      return;
    }
    setError("");
    setSaving(true);
    try {
      const payload = {
        name: trimmed,
        ...(code.trim() ? { code: code.trim().toUpperCase() } : {}),
        ...(description.trim() ? { description: description.trim().slice(0, 250) } : {}),
      };
      if (unit) await updateAdminEnterpriseStructure(organisationId, kind, unit.id, payload);
      else await createAdminEnterpriseStructure(organisationId, kind, payload);
      await onSaved();
    } catch (err) {
      setError(structureError(err, `Could not save this ${label.toLowerCase()}.`));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title={unit ? `Edit ${label}` : `Add ${label}`} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">{label} name *</span>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={`Enter ${label.toLowerCase()} name`}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">{label} code</span>
          <input
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder="Enter code (optional)"
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Description (optional)</span>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value.slice(0, 250))}
            placeholder="Enter description"
            rows={4}
            className={cn(fieldClass, "min-h-24 py-2.5")}
          />
          <p className="mt-1 text-right font-saveful text-[11px] text-gray-400">{description.length} / 250</p>
        </label>
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

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  danger,
  onClose,
  onConfirm,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={title} onClose={onClose}>
      <p className="font-saveful text-sm leading-relaxed text-gray-600">{body}</p>
      {error ? <p className="mt-3 font-saveful text-sm text-amber-700">{error}</p> : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={saving}
          className={danger ? "bg-red-600 hover:bg-red-700" : undefined}
          onClick={async () => {
            setError("");
            setSaving(true);
            try {
              await onConfirm();
            } catch (err) {
              setError(structureError(err, "This action could not be completed."));
            } finally {
              setSaving(false);
            }
          }}
        >
          {saving ? "Saving…" : confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 p-4 sm:items-center">
      <div className="w-full max-w-md rounded-2xl border border-black/[0.05] bg-white p-5 shadow-xl">
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

const fieldClass =
  "h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-900 outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white";
