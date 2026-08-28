"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Info } from "lucide-react";
import { AdminPage, AdminSection, StatusPill, useAdminFilters } from "@/components/admin/AdminChrome";
import { useSession } from "@/lib/auth";
import { useAdminAuditVersion } from "@/lib/adminAudit";
import {
  buildPlatformNotificationsModel,
  savePlatformRule,
  useAdminNotificationsVersion,
  type PlatformRuleId,
  type ThresholdDays,
} from "@/lib/adminNotifications";
import { formatDisplayDateTime } from "@/lib/dates";
import { formatCount } from "@/lib/impact";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "rules", label: "Notification rules" },
  { id: "system", label: "System notifications" },
  { id: "audit", label: "Audit trail" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AdminNotifications() {
  useAdminNotificationsVersion();
  useAdminAuditVersion();
  const user = useSession();
  const { query } = useAdminFilters();
  const model = buildPlatformNotificationsModel();
  const [tab, setTab] = useState<TabId>("rules");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "required" | "configurable">("all");
  const [selectedId, setSelectedId] = useState<PlatformRuleId>("accessChanged");
  const selected = model.rows.find((row) => row.id === selectedId) ?? model.rows[0];

  const filtered = useMemo(() => {
    const queryText = q.trim().toLowerCase();
    return model.rows.filter((row) => {
      if (kind !== "all" && row.kind !== kind) return false;
      if (
        queryText &&
        !`${row.eventType} ${row.trigger} ${row.orgTypes} ${row.participation}`.toLowerCase().includes(queryText)
      ) {
        return false;
      }
      return true;
    });
  }, [kind, model.rows, q]);

  const metrics = [
    { label: "Supported rules", value: formatCount(model.metrics.supported), hint: "Enterprise-facing events only" },
    { label: "System required", value: formatCount(model.metrics.required), hint: "Enterprises cannot turn these off" },
    { label: "Configurable", value: formatCount(model.metrics.configurable), hint: "Enterprise can enable or disable" },
    { label: "On for Harbour Kitchen", value: formatCount(model.metrics.enterpriseOn), hint: "Current Enterprise settings" },
    { label: "Admin surfaces", value: formatCount(model.metrics.adminSurfaces), hint: "Required in-product Admin alerts" },
    { label: "Supported channel", value: model.channel, hint: `Same unresolved alert waits ${model.renotifyDays} days` },
  ];

  return (
    <AdminPage
      workspace
      crumb={[{ href: `/admin/dashboard${query}`, label: "Dashboard" }]}
      title="Platform Notifications & Rules"
      hint="Platform defaults that sit above Enterprise notification settings. Only events and the in-app channel Saveful already supports."
    >
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
        {metrics.map((item) => (
          <article key={item.label} className="rounded-xl border border-gray-200 bg-white px-3.5 py-3">
            <p className="font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">{item.label}</p>
            <p className="mt-2 font-saveful-bold text-lg tabular-nums leading-none text-gray-900">{item.value}</p>
            <p className="mt-1.5 truncate font-saveful text-[11px] text-gray-500">{item.hint}</p>
          </article>
        ))}
      </div>

      <div className="flex gap-2 rounded-xl bg-saveful-green/[0.06] px-3 py-2.5">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
        <p className="font-saveful text-xs leading-relaxed text-gray-600">
          Enterprise Notifications choose what is available to that customer. This page sets the platform rule above them:
          event type, who it applies to, trigger, channel, status, and default behaviour. Push, email, SMS, templates and
          quiet hours are not supported and are not shown.
        </p>
      </div>

      <div className="flex gap-5 overflow-x-auto border-b border-gray-100">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={cn(
              "-mb-px border-b-2 py-2.5 font-saveful-semibold text-sm whitespace-nowrap",
              tab === item.id ? "border-saveful-green text-gray-900" : "border-transparent text-gray-500 hover:text-gray-800",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "rules" ? (
        <div className="grid gap-3 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <AdminSection
              title="Notification rules"
              action={
                <div className="flex items-center gap-2">
                  <input
                    value={q}
                    onChange={(event) => setQ(event.target.value)}
                    placeholder="Search rules…"
                    className="h-8 w-36 rounded-lg border border-black/[0.06] bg-white px-2.5 font-saveful text-xs outline-none sm:w-44"
                  />
                  <select
                    value={kind}
                    onChange={(event) => setKind(event.target.value as typeof kind)}
                    className="h-8 rounded-lg border border-black/[0.06] bg-white px-2 font-saveful text-xs outline-none"
                  >
                    <option value="all">All classes</option>
                    <option value="required">System required</option>
                    <option value="configurable">Configurable</option>
                  </select>
                </div>
              }
            >
              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="px-3 py-2.5 font-saveful">Event type</th>
                      <th className="px-3 py-2.5 font-saveful">Org type / role</th>
                      <th className="px-3 py-2.5 font-saveful">Trigger</th>
                      <th className="px-3 py-2.5 font-saveful">Channel</th>
                      <th className="px-3 py-2.5 font-saveful">Status</th>
                      <th className="px-3 py-2.5 font-saveful">Default</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row) => (
                      <tr
                        key={row.id}
                        className={cn("border-b border-gray-50 last:border-0", selected.id === row.id && "bg-saveful-green/[0.04]")}
                      >
                        <td className="px-3 py-3">
                          <button type="button" onClick={() => setSelectedId(row.id)} className="text-left">
                            <span className="block font-saveful-semibold text-sm text-gray-900">{row.eventType}</span>
                            <span className="block font-saveful text-[11px] text-gray-400">{row.group}</span>
                            {row.kind === "required" ? (
                              <span className="mt-1 inline-block rounded-full bg-amber-50 px-1.5 py-0.5 font-saveful text-[10px] uppercase tracking-wide text-amber-700">
                                System required
                              </span>
                            ) : (
                              <span className="mt-1 inline-block rounded-full bg-[#F7F6F2] px-1.5 py-0.5 font-saveful text-[10px] uppercase tracking-wide text-gray-500">
                                Configurable
                              </span>
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-3">
                          <p className="font-saveful text-sm text-gray-800">{row.orgTypes}</p>
                          <p className="font-saveful text-xs text-gray-500">{row.participation}</p>
                        </td>
                        <td className="max-w-[16rem] px-3 py-3 font-saveful text-sm text-gray-700">{row.trigger}</td>
                        <td className="px-3 py-3 font-saveful text-sm text-gray-700">{row.channel}</td>
                        <td className="px-3 py-3">
                          <StatusPill status={row.status === "Active" ? "Active" : "Off"} />
                        </td>
                        <td className="px-3 py-3 font-saveful text-sm text-gray-600">{row.behaviour}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </AdminSection>
          </div>
          <div className="space-y-3 xl:col-span-4">
            <RuleEditor
              selected={selected}
              thresholds={model.thresholds}
              onSave={(patch) => savePlatformRule(selected.id, patch, user)}
            />
            <AdminSection title="Above Enterprise settings">
              <p className="px-3.5 py-3 font-saveful text-sm leading-relaxed text-gray-600">
                Configurable rules can be turned off in{" "}
                <span className="font-saveful-semibold">Enterprise Settings → Notifications</span>. System-required rules
                stay on for every Enterprise. Users still choose personal in-app preferences in My Profile, but only for
                alerts their Enterprise has available.
              </p>
            </AdminSection>
          </div>
        </div>
      ) : null}

      {tab === "system" ? (
        <AdminSection title="Saveful Admin system notifications">
          <p className="px-3.5 pt-3 font-saveful text-xs text-gray-500">
            These stay on for Saveful Admin. They appear in the Admin portal, not as a separate messaging product.
          </p>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead>
                <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                  <th className="px-3 py-2.5 font-saveful">Event type</th>
                  <th className="px-3 py-2.5 font-saveful">Org type / role</th>
                  <th className="px-3 py-2.5 font-saveful">Trigger</th>
                  <th className="px-3 py-2.5 font-saveful">Channel</th>
                  <th className="px-3 py-2.5 font-saveful">Status</th>
                  <th className="px-3 py-2.5 font-saveful">Default</th>
                </tr>
              </thead>
              <tbody>
                {model.system.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-3 py-3">
                      <p className="font-saveful-semibold text-sm text-gray-900">{row.eventType}</p>
                      <p className="font-saveful text-[11px] text-gray-400">{row.surface}</p>
                    </td>
                    <td className="px-3 py-3">
                      <p className="font-saveful text-sm text-gray-800">{row.orgTypes}</p>
                      <p className="font-saveful text-xs text-gray-500">{row.participation}</p>
                    </td>
                    <td className="max-w-[18rem] px-3 py-3 font-saveful text-sm text-gray-700">{row.trigger}</td>
                    <td className="px-3 py-3 font-saveful text-sm text-gray-700">{model.channel}</td>
                    <td className="px-3 py-3">
                      <StatusPill status="Active" />
                    </td>
                    <td className="px-3 py-3 font-saveful text-sm text-gray-600">Always on for Saveful Admin</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </AdminSection>
      ) : null}

      {tab === "audit" ? (
        <AdminSection
          title="Notification rule changes"
          action={
            <Link href={`/admin/audit${query}`} className="font-saveful-semibold text-xs text-saveful-green hover:underline">
              Platform Audit Log →
            </Link>
          }
        >
          {model.audit.length ? (
            <ul>
              {model.audit.map((row) => (
                <li key={row.id} className="border-b border-gray-50 px-3.5 py-2.5 last:border-0">
                  <p className="font-saveful-semibold text-sm text-gray-900">{row.action}</p>
                  <p className="font-saveful text-xs text-gray-500">{row.entity} · {row.detail}</p>
                  {row.changes.map((change) => (
                    <p key={change.field} className="font-saveful text-xs text-gray-600">
                      {change.field}: {change.previous} → {change.next}
                    </p>
                  ))}
                  <p className="mt-0.5 font-saveful text-[11px] text-gray-400">{formatDisplayDateTime(row.at)}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-3.5 py-6 font-saveful text-sm text-gray-400">No platform notification changes yet.</p>
          )}
        </AdminSection>
      ) : null}

      <p className="rounded-xl border border-sky-100 bg-sky-50/70 px-3.5 py-2.5 font-saveful text-xs text-sky-800">
        In-app alerts use the same site activity rules as Dashboard, Sites and Network Performance. The same unresolved
        condition is not sent again for {model.renotifyDays} days.
      </p>
    </AdminPage>
  );
}

function RuleEditor({
  selected,
  thresholds,
  onSave,
}: {
  selected: ReturnType<typeof buildPlatformNotificationsModel>["rows"][number];
  thresholds: readonly ThresholdDays[];
  onSave: (patch: { required?: boolean; defaultEnabled?: boolean; days?: ThresholdDays }) => void;
}) {
  return (
    <AdminSection title="Selected rule">
      <div className="space-y-3 px-3.5 py-3">
        <div>
          <p className="font-saveful-bold text-sm text-gray-900">{selected.eventType}</p>
          <p className="mt-1 font-saveful text-xs text-gray-500">{selected.trigger}</p>
        </div>
        <dl className="space-y-1.5 font-saveful text-sm">
          <Row label="Audience" value={selected.audience} />
          <Row label="Org type" value={selected.orgTypes} />
          <Row label="Participation" value={selected.participation} />
          <Row label="Channel" value={selected.channel} />
        </dl>
        <label className="flex items-center justify-between gap-3">
          <span className="font-saveful text-sm text-gray-700">System required</span>
          <input
            type="checkbox"
            checked={selected.config.required}
            onChange={(event) => onSave({ required: event.target.checked })}
            className="h-4 w-4 accent-saveful-green"
          />
        </label>
        <label className="flex items-center justify-between gap-3">
          <span className="font-saveful text-sm text-gray-700">Default on</span>
          <input
            type="checkbox"
            checked={selected.config.defaultEnabled}
            disabled={selected.config.required}
            onChange={(event) => onSave({ defaultEnabled: event.target.checked })}
            className="h-4 w-4 accent-saveful-green disabled:opacity-40"
          />
        </label>
        {selected.hasThreshold ? (
          <label className="block">
            <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Default threshold</span>
            <select
              value={selected.config.days}
              onChange={(event) => onSave({ days: Number(event.target.value) as ThresholdDays })}
              className="h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm outline-none"
            >
              {thresholds.map((days) => (
                <option key={days} value={days}>
                  {days} days
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <p className="font-saveful text-xs text-gray-500">
          Changes are audited. Required rules stay on in every Enterprise Notifications page.
        </p>
      </div>
    </AdminSection>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="text-right text-gray-800">{value}</dd>
    </div>
  );
}
