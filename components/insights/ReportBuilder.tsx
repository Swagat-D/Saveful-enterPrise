"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Building2, Calendar, Check, FileSpreadsheet, FileText, List } from "lucide-react";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { useSession } from "@/lib/auth";
import { recordNotificationEvent } from "@/lib/notifications";
import { getOrganization, useOrganizationVersion } from "@/lib/organization";
import { formatDisplayDate, periodLabel, periodRange } from "@/lib/dates";
import {
  DEFAULT_REPORT_SECTIONS,
  REPORT_SECTIONS,
  buildReportPayload,
  downloadReportExcel,
  hasReportableData,
  printReportPdf,
  reportFiltersFromScope,
  type ReportFormat,
  type ReportSection,
} from "@/lib/impactReport";
import { insightsFiltersToQuery, parseInsightsFilters, type InsightsFilters } from "@/lib/insights";
import { demoNetworkSites } from "@/lib/network";
import { filterOptions } from "@/lib/networkQuery";
import { useOrgStructureVersion } from "@/lib/orgStructure";
import { scopeFromUser } from "@/lib/scope";
import type { PeriodKey } from "@/types/enterprise";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 w-full appearance-none rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40";

const PERIODS: { id: PeriodKey | "custom"; label: string }[] = [
  { id: "7", label: "Last 7 days" },
  { id: "30", label: "Last 30 days" },
  { id: "90", label: "Last 90 days" },
  { id: "all", label: "All time" },
  { id: "custom", label: "Custom dates" },
];

function hasSelectedAreas(filters: InsightsFilters) {
  return (
    filters.groupId !== "all" ||
    filters.territoryId !== "all" ||
    filters.clusterId !== "all" ||
    filters.siteId !== "all"
  );
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function ReportBuilder() {
  const searchParams = useSearchParams();
  const user = useSession();
  useOrganizationVersion();
  const organization = getOrganization();
  const scope = scopeFromUser(user);
  const incoming = useMemo(() => parseInsightsFilters(searchParams), [searchParams]);
  useOrgStructureVersion();

  const [mode, setMode] = useState<"enterprise" | "areas">(hasSelectedAreas(incoming) ? "areas" : "enterprise");
  const [groupId, setGroupId] = useState(incoming.groupId);
  const [territoryId, setTerritoryId] = useState(incoming.territoryId);
  const [clusterId, setClusterId] = useState(incoming.clusterId);
  const [siteId, setSiteId] = useState(incoming.siteId);
  const [period, setPeriod] = useState<PeriodKey | "custom">(incoming.period);
  const initialRange = periodRange(incoming.period);
  const [from, setFrom] = useState(initialRange.startDate ?? "");
  const [to, setTo] = useState(initialRange.endDate ?? "");
  const [sections, setSections] = useState<ReportSection[]>(DEFAULT_REPORT_SECTIONS);
  const [format, setFormat] = useState<ReportFormat>("pdf");
  const [status, setStatus] = useState<"idle" | "empty" | "generating" | "ready">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const filters = useMemo(
    () =>
      reportFiltersFromScope({
        groupId: mode === "enterprise" ? "all" : groupId,
        territoryId: mode === "enterprise" ? "all" : territoryId,
        clusterId: mode === "enterprise" ? "all" : clusterId,
        siteId: mode === "enterprise" ? "all" : siteId,
        period: period === "custom" ? "30" : period,
        pathway: incoming.pathway,
      }),
    [mode, groupId, territoryId, clusterId, siteId, period, incoming.pathway],
  );
  const range = period === "custom" ? { startDate: from || undefined, endDate: to || undefined } : undefined;
  const options = useMemo(() => filterOptions(demoNetworkSites, scope, filters), [scope, filters]);
  const payload = useMemo(
    () =>
      buildReportPayload({
        filters,
        scope,
        range,
        sections,
        format,
        organisation: organization.name,
      }),
    [filters, scope, range, sections, format, organization.name],
  );

  const backHref = `/insights${insightsFiltersToQuery(incoming)}`;
  const scopeLabel = mode === "enterprise" ? "Entire Enterprise" : payload.scopeLabel;
  const periodText = period === "custom" ? payload.periodLabel : PERIODS.find((item) => item.id === period)?.label ?? periodLabel(filters.period);

  const toggle = (id: ReportSection) => {
    setStatus("idle");
    setSections((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  const choosePeriod = (next: PeriodKey | "custom") => {
    setStatus("idle");
    setPeriod(next);
    if (next !== "custom") {
      const dates = periodRange(next);
      setFrom(dates.startDate ?? "");
      setTo(dates.endDate ?? "");
    }
  };

  const generate = async () => {
    if (!sections.length || status === "generating") return;
    if (!hasReportableData(payload)) {
      setStatus("empty");
      setError("No data available for this selection. Try changing your reporting period or scope.");
      return;
    }
    setError("");
    setStatus("generating");
    setProgress(18);
    await wait(220);
    setProgress(48);
    await wait(240);
    setProgress(78);
    const next = buildReportPayload({
      filters,
      scope,
      range,
      sections,
      format,
      organisation: organization.name,
    });
    await wait(220);
    if (format === "excel") {
      downloadReportExcel(next);
    } else {
      const opened = printReportPdf(next);
      if (!opened) {
        setStatus("idle");
        setError("Allow pop-ups to open the PDF report.");
        return;
      }
    }
    recordNotificationEvent({
      kind: "report_ready",
      title: "Enterprise report ready",
      detail: `${next.title} is ready to view or download.`,
      href: "/insights",
      actorEmail: user?.email,
    });
    setProgress(100);
    setStatus("ready");
  };

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href={backHref} className="hover:text-saveful-green">
            Insights & Reports
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">Create report</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="border-b border-gray-100 px-4 py-3.5 sm:px-5">
            <h1 className="font-saveful-bold text-xl text-gray-900 sm:text-2xl">Create report</h1>
            <p className="mt-1.5 font-saveful text-xs text-gray-500">
              Choose the scope, period, sections and format. Figures use the same data and Saveful methodology as Insights.
            </p>
          </header>

          <div className="space-y-4 p-4 sm:p-5">
            <Step n={1} title="Reporting scope" hint="What would you like to report on?">
              <div className="flex flex-wrap gap-2">
                <Choice active={mode === "enterprise"} onClick={() => { setMode("enterprise"); setStatus("idle"); }}>
                  Entire Enterprise
                </Choice>
                <Choice active={mode === "areas"} onClick={() => { setMode("areas"); setStatus("idle"); }}>
                  Selected areas
                </Choice>
              </div>
              {mode === "enterprise" ? (
                <p className="mt-3 font-saveful text-xs text-gray-500">
                  Includes every location you are authorised to see.
                </p>
              ) : (
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Field label="Group">
                    <Select value={groupId} onChange={setGroupId} options={[{ id: "all", name: "All groups" }, ...options.groups]} />
                  </Field>
                  <Field label="Territory">
                    <Select value={territoryId} onChange={setTerritoryId} options={[{ id: "all", name: "All territories" }, ...options.territories]} />
                  </Field>
                  <Field label="Cluster">
                    <Select value={clusterId} onChange={setClusterId} options={[{ id: "all", name: "All clusters" }, ...options.clusters]} />
                  </Field>
                  <Field label="Site">
                    <Select value={siteId} onChange={setSiteId} options={[{ id: "all", name: "All sites" }, ...options.sites]} />
                  </Field>
                </div>
              )}
            </Step>

            <Step n={2} title="Reporting period" hint="Choose the period for this report.">
              <Select
                value={period}
                onChange={(value) => choosePeriod(value as PeriodKey | "custom")}
                options={PERIODS.map((item) => ({ id: item.id, name: item.label }))}
              />
              <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Field label="From">
                  <input
                    type="date"
                    value={from}
                    onChange={(event) => {
                      setFrom(event.target.value);
                      setPeriod("custom");
                      setStatus("idle");
                    }}
                    className={selectClass}
                  />
                </Field>
                <Field label="To">
                  <input
                    type="date"
                    value={to}
                    onChange={(event) => {
                      setTo(event.target.value);
                      setPeriod("custom");
                      setStatus("idle");
                    }}
                    className={selectClass}
                  />
                </Field>
              </div>
            </Step>

            <Step n={3} title="Include in report" hint="Select the information you’d like to include.">
              <div className="space-y-2">
                {REPORT_SECTIONS.map((item) => (
                  <label key={item.id} className="flex items-start gap-3 rounded-xl border border-gray-100 px-3 py-2.5">
                    <input
                      type="checkbox"
                      checked={sections.includes(item.id)}
                      onChange={() => toggle(item.id)}
                      className="mt-0.5 accent-saveful-green"
                    />
                    <span>
                      <span className="block font-saveful-semibold text-sm text-gray-900">{item.label}</span>
                      <span className="block font-saveful text-xs text-gray-500">{item.hint}</span>
                    </span>
                  </label>
                ))}
              </div>
            </Step>

            <Step n={4} title="Report format" hint="Choose your format.">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <FormatCard
                  active={format === "pdf"}
                  onClick={() => { setFormat("pdf"); setStatus("idle"); }}
                  icon={<FileText className="h-5 w-5" />}
                  title="PDF"
                  hint="Formatted management / ESG report."
                />
                <FormatCard
                  active={format === "excel"}
                  onClick={() => { setFormat("excel"); setStatus("idle"); }}
                  icon={<FileSpreadsheet className="h-5 w-5" />}
                  title="Excel"
                  hint="Underlying structured data for analysis."
                />
              </div>
            </Step>

            <section className="overflow-hidden rounded-xl border border-saveful-green/15 bg-saveful-green/[0.04]">
              <div className="flex items-center gap-2 border-b border-saveful-green/10 px-3.5 py-2">
                <FileText className="h-3.5 w-3.5 text-saveful-green" />
                <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">Report summary</h2>
              </div>
              <dl className="grid grid-cols-1 gap-3 px-3.5 py-3 sm:grid-cols-2 lg:grid-cols-5">
                <SummaryItem icon={<Building2 className="h-3.5 w-3.5" />} label="Organisation" value={payload.organisation} />
                <SummaryItem icon={<Building2 className="h-3.5 w-3.5" />} label="Scope" value={scopeLabel} />
                <SummaryItem icon={<Calendar className="h-3.5 w-3.5" />} label="Period" value={periodText} />
                <SummaryItem icon={<List className="h-3.5 w-3.5" />} label="Includes" value={`${sections.length} section${sections.length === 1 ? "" : "s"}`} />
                <SummaryItem icon={<FileText className="h-3.5 w-3.5" />} label="Format" value={format === "pdf" ? "PDF" : "Excel"} />
              </dl>
              {from && to && period !== "all" ? (
                <p className="px-3.5 pb-3 font-saveful text-[11px] text-gray-500">
                  {formatDisplayDate(from)} – {formatDisplayDate(to)}
                </p>
              ) : null}
            </section>

            {status === "empty" || error ? (
              <p className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 font-saveful text-sm text-amber-800">
                {error || "No data available for this selection. Try changing your reporting period or scope."}
              </p>
            ) : null}

            {status === "generating" || status === "ready" ? (
              <div className="rounded-xl border border-gray-200 px-3.5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-saveful text-sm text-gray-700">
                    {status === "ready" ? "Report ready." : "Generating report…"}
                  </p>
                  {status === "ready" ? <Check className="h-4 w-4 text-saveful-green" /> : null}
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F0EEE8]">
                  <div className="h-full rounded-full bg-saveful-green transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-end gap-2">
              <Link
                href={backHref}
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Cancel
              </Link>
              <button
                type="button"
                onClick={() => void generate()}
                disabled={!sections.length || status === "generating"}
                className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white disabled:opacity-40"
              >
                {status === "generating" ? "Generating…" : status === "ready" ? "Generate again" : "Generate report"}
              </button>
            </div>
          </div>
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}

function Step({ n, title, hint, children }: { n: number; title: string; hint: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start gap-3 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2.5">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-saveful-green font-saveful-semibold text-xs text-white">
          {n}
        </span>
        <div>
          <h2 className="font-saveful-semibold text-sm text-gray-900">{title}</h2>
          <p className="font-saveful text-xs text-gray-500">{hint}</p>
        </div>
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-9 items-center rounded-lg border px-3 font-saveful-semibold text-sm",
        active
          ? "border-saveful-green bg-saveful-green/10 text-saveful-green"
          : "border-black/[0.06] bg-white text-gray-800 hover:bg-[#F7F6F2]",
      )}
    >
      {children}
    </button>
  );
}

function FormatCard({
  active,
  onClick,
  icon,
  title,
  hint,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3.5 py-3 text-left",
        active ? "border-saveful-green bg-saveful-green/[0.06] shadow-sm" : "border-gray-200 hover:bg-[#FAF7F0]",
      )}
    >
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", active ? "bg-saveful-green text-white" : "bg-[#F7F6F2] text-saveful-green")}>
        {icon}
      </span>
      <p className="mt-2 font-saveful-semibold text-sm text-gray-900">{title}</p>
      <p className="mt-0.5 font-saveful text-xs text-gray-500">{hint}</p>
    </button>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { id: string; name: string }[];
}) {
  return (
    <div className="relative">
      <select value={value} onChange={(event) => onChange(event.target.value)} className={selectClass}>
        {options.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-400">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </span>
    </div>
  );
}

function SummaryItem({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">{value}</dd>
    </div>
  );
}
