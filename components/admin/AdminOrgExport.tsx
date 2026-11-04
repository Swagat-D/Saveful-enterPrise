"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
import { ChevronDown, Download, FileSpreadsheet, X } from "lucide-react";
import { PeriodFilter } from "@/components/filters/PeriodFilter";
import { listingPillStatus } from "@/components/admin/AdminRecordPanels";
import {
  EMPTY_ADMIN_FILTERS,
  EMPTY_ADMIN_SITES_FILTERS,
  buildSitesDirectory,
  collectionKg,
  getOrganisation,
  listCollections,
  listListings,
  orgTypeLabel,
  participationLabel,
  type AdminCollection,
  type AdminDirectorySite,
} from "@/lib/admin";
import { inDateRange, liveToday, periodLabel, periodRange } from "@/lib/dates";
import { calculateImpact } from "@/lib/impact";
import { PATHWAY_LABEL } from "@/lib/networkQuery";
import type { PeriodKey, RecoveryPathway } from "@/types/enterprise";

type Cell = string | number;
type ReportOptions = { period: PeriodKey; from?: string; to?: string; siteId: string };

const DAY = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" });
const TIME = new Intl.DateTimeFormat("en-AU", { timeZone: "Australia/Sydney", hour: "2-digit", minute: "2-digit", hour12: false });

function day(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : DAY.format(date);
}

function time(iso?: string | null) {
  if (!iso) return "";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : TIME.format(date);
}

function dateTime(iso?: string | null) {
  const value = day(iso);
  return value ? `${value} ${time(iso)}` : "";
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function statusLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

function pathwayLabel(pathway: RecoveryPathway) {
  return PATHWAY_LABEL[pathway] ?? pathway;
}

type Totals = { collections: number; kg: number; edibleKg: number; livestockKg: number; circularKg: number; bioenergyKg: number };

function emptyTotals(): Totals {
  return { collections: 0, kg: 0, edibleKg: 0, livestockKg: 0, circularKg: 0, bioenergyKg: 0 };
}

function addTo(totals: Totals, row: AdminCollection, kg = collectionKg(row)) {
  totals.collections += 1;
  totals.kg += kg;
  if (row.pathway === "people") totals.edibleKg += kg;
  if (row.pathway === "livestock") totals.livestockKg += kg;
  if (row.pathway === "circular") totals.circularKg += kg;
  if (row.pathway === "bioenergy") totals.bioenergyKg += kg;
}

function impactCells(totals: Totals): Cell[] {
  return [
    totals.collections,
    round(totals.kg),
    round(totals.edibleKg),
    round(totals.livestockKg),
    Math.round(calculateImpact(totals.edibleKg).mealsCreated),
    round(calculateImpact(totals.kg).co2AvoidedKg),
  ];
}

const IMPACT_HEADERS = ["Collections", "Total kg", "Edible kg", "Livestock feed kg", "Meals created", "CO₂ avoided kg"];

function sheet(rows: Cell[][], widths: number[]) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = widths.map((wch) => ({ wch }));
  return ws;
}

function foodItems(row: AdminCollection) {
  const kg = collectionKg(row);
  const items = row.items?.length ? row.items : [{ name: row.food || "Mixed surplus", totalQtyKg: kg }];
  const itemTotal = items.reduce((sum, item) => sum + (item.totalQtyKg || 0), 0);
  return items.map((item) => ({
    name: item.name || "Mixed surplus",
    kg: kg > 0 ? (itemTotal > 0 ? kg * ((item.totalQtyKg || 0) / itemTotal) : kg / items.length) : item.totalQtyKg || 0,
  }));
}

function collectReport(orgId: string, options: ReportOptions) {
  const org = getOrganisation(orgId);
  const { startDate, endDate } = periodRange(options.period, liveToday(), { from: options.from, to: options.to });
  const sites = buildSitesDirectory({ ...EMPTY_ADMIN_FILTERS, organisationId: orgId, period: "all" }, EMPTY_ADMIN_SITES_FILTERS).rows;
  const siteById = new Map(sites.map((site) => [site.id, site]));
  const siteFilter = options.siteId === "all" ? null : options.siteId;

  const collections = listCollections()
    .filter((row) => row.orgId === orgId || row.recipientOrgId === orgId)
    .filter((row) => !siteFilter || (row.orgId === orgId && row.siteId === siteFilter))
    .filter((row) => inDateRange(row.occurredAt, startDate, endDate))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
  const completed = collections.filter((row) => row.status === "completed");
  const listings = listListings()
    .filter((row) => row.orgId === orgId && (!siteFilter || row.siteId === siteFilter))
    .filter((row) => inDateRange(row.createdAt, startDate, endDate))
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return { org, startDate, endDate, sites, siteById, siteFilter, collections, completed, listings };
}

function partnerOf(orgId: string, row: AdminCollection) {
  return row.orgId === orgId
    ? { id: row.recipientOrgId || row.recipientName, name: row.recipientName || "Recipient", relationship: "Collected our food" }
    : { id: row.orgId, name: row.providerName || getOrganisation(row.orgId)?.name || "Provider", relationship: "We collected from" };
}

function collectionRows(orgId: string, report: ReturnType<typeof collectReport>): Cell[][] {
  return [
    [
      "Date",
      "Time",
      "Collection ID",
      "Listing ID",
      "Site",
      "Site ID",
      "Partner organisation",
      "Relationship",
      "Food items",
      "Pathway",
      "Collected kg",
      "Listing total kg",
      "Meals created",
      "CO₂ avoided kg",
      "Collected by",
      "Status",
    ],
    ...report.collections.map((row) => {
      const kg = collectionKg(row);
      const partner = partnerOf(orgId, row);
      const site = report.siteById.get(row.siteId);
      return [
        day(row.occurredAt),
        time(row.occurredAt),
        row.code,
        row.listingCode ?? "",
        row.siteName || site?.name || "",
        site?.siteCode ?? "",
        partner.name,
        partner.relationship,
        foodItems(row).map((item) => `${item.name} (${round(item.kg)} kg)`).join(", "),
        pathwayLabel(row.pathway),
        round(kg),
        round(row.listingTotalKg ?? kg),
        row.pathway === "people" ? Math.round(calculateImpact(kg).mealsCreated) : 0,
        round(calculateImpact(kg).co2AvoidedKg),
        row.driverName ? `Driver ${row.driverName}` : row.status === "completed" ? row.recipientName : "",
        statusLabel(row.claimStatus || row.status),
      ];
    }),
  ];
}

const REPORT_PARTS = ["Impact summary", "By site", "Partner organisations", "By date", "Food items", "Every collection", "Every listing"];

type Section = { name: string; rows: Cell[][]; widths: number[] };

function buildReport(orgId: string, options: ReportOptions) {
  const report = collectReport(orgId, options);
  const { org, completed, listings } = report;
  const orgName = org?.name ?? orgId;
  const siteName = report.siteFilter ? report.siteById.get(report.siteFilter)?.name ?? report.siteFilter : "All sites";
  const sections: Section[] = [];
  const section = (rows: Cell[][], widths: number[]) => ({ rows, widths });
  const addSection = (value: { rows: Cell[][]; widths: number[] }, name: string) => sections.push({ name, ...value });

  const totals = emptyTotals();
  completed.forEach((row) => addTo(totals, row));
  const impact = calculateImpact(totals.kg);
  const partners = new Set(completed.map((row) => partnerOf(orgId, row).id));
  const contributingSites = new Set(completed.filter((row) => row.orgId === orgId).map((row) => row.siteId));
  const collectedListings = listings.filter((row) => (row.claims ?? []).some((claim) => claim.status === "COLLECTED")).length;
  const expiredListings = listings.filter((row) => listingPillStatus(row) === "EXPIRED").length;

  addSection(
    section(
      [
        ["Saveful for Business — Organisation Impact Report"],
        [],
        ["Organisation", orgName],
        ["Type", org ? orgTypeLabel(org.type) : ""],
        ["Participation", org ? participationLabel(org.roles) : ""],
        ["Site", siteName],
        ["Period", periodLabel(options.period, { from: options.from, to: options.to })],
        ["Date range", report.startDate && report.endDate ? `${report.startDate} to ${report.endDate}` : "All time"],
        ["Generated", dateTime(new Date().toISOString())],
        [],
        ["Metric", "Value"],
        ["Food diverted kg (edible & non-edible)", round(totals.kg)],
        ["CO₂ avoided kg (edible & non-edible)", round(impact.co2AvoidedKg)],
        ["Livestock feed kg (non-edible)", round(totals.livestockKg)],
        ["Edible food recovered kg", round(totals.edibleKg)],
        ["Higher-value / circular recovery kg", round(totals.circularKg)],
        ["Bioenergy kg", round(totals.bioenergyKg)],
        ["Meals created (edible food only)", Math.round(calculateImpact(totals.edibleKg).mealsCreated)],
        ["Estimated food value", round(impact.foodValue, 2)],
        ["Collections completed", totals.collections],
        ["Listings published", listings.filter((row) => row.status.toLowerCase() !== "cancelled").length],
        ["Listings with a collection", collectedListings],
        ["Listings expired without collection", expiredListings],
        ["Sites contributing", contributingSites.size],
        ["Partner organisations", partners.size],
        [],
        ["Notes", "Figures reflect completed collections in the selected period. Meals are calculated from edible food only (0.42 kg per meal); CO₂ uses 2.1 kg per kg of food diverted."],
      ],
      [40, 36],
    ),
    "Impact",
  );

  const bySite = new Map<string, Totals>();
  const listingsBySite = new Map<string, number>();
  const lastBySite = new Map<string, string>();
  for (const row of completed.filter((item) => item.orgId === orgId)) {
    const current = bySite.get(row.siteId) ?? emptyTotals();
    addTo(current, row);
    bySite.set(row.siteId, current);
    if ((lastBySite.get(row.siteId) ?? "") < row.occurredAt) lastBySite.set(row.siteId, row.occurredAt);
  }
  for (const row of listings) listingsBySite.set(row.siteId, (listingsBySite.get(row.siteId) ?? 0) + 1);
  const siteRows: AdminDirectorySite[] = report.siteFilter
    ? report.sites.filter((site) => site.id === report.siteFilter)
    : report.sites;
  addSection(
    section(
      [
        ["Site", "Site ID", "Group", "Territory", "Cluster", "Site status", "Listings published", ...IMPACT_HEADERS, "Last collection"],
        ...siteRows
          .map((site) => ({ site, totals: bySite.get(site.id) ?? emptyTotals() }))
          .sort((a, b) => b.totals.kg - a.totals.kg || a.site.name.localeCompare(b.site.name))
          .map(({ site, totals: siteTotals }) => [
            site.name,
            site.siteCode,
            site.groupLabel,
            site.territoryLabel,
            site.clusterLabel,
            statusLabel(site.siteStatus),
            listingsBySite.get(site.id) ?? 0,
            ...impactCells(siteTotals),
            day(lastBySite.get(site.id)),
          ]),
      ],
      [30, 14, 18, 16, 16, 12, 10, 12, 10, 10, 14, 12, 14, 14],
    ),
    "By site",
  );

  const byPartner = new Map<string, { name: string; relationship: string; totals: Totals; first: string; last: string; foods: Map<string, number> }>();
  for (const row of completed) {
    const partner = partnerOf(orgId, row);
    const current =
      byPartner.get(partner.id) ??
      { name: partner.name, relationship: partner.relationship, totals: emptyTotals(), first: row.occurredAt, last: row.occurredAt, foods: new Map<string, number>() };
    addTo(current.totals, row);
    if (row.occurredAt < current.first) current.first = row.occurredAt;
    if (row.occurredAt > current.last) current.last = row.occurredAt;
    for (const item of foodItems(row)) current.foods.set(item.name, (current.foods.get(item.name) ?? 0) + item.kg);
    byPartner.set(partner.id, current);
  }
  addSection(
    section(
      [
        ["#", "Organisation", "Relationship", ...IMPACT_HEADERS, "Share %", "First collection", "Last collection", "Food types"],
        ...[...byPartner.values()]
          .sort((a, b) => b.totals.kg - a.totals.kg)
          .map((partner, index) => [
            index + 1,
            partner.name,
            partner.relationship,
            ...impactCells(partner.totals),
            totals.kg > 0 ? Math.round((partner.totals.kg / totals.kg) * 100) : 0,
            day(partner.first),
            day(partner.last),
            [...partner.foods.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, kg]) => `${name} (${round(kg)} kg)`)
              .join(", "),
          ]),
      ],
      [4, 30, 18, 12, 10, 10, 14, 12, 14, 8, 14, 14, 60],
    ),
    "Partner organisations",
  );

  const byDay = new Map<string, Totals>();
  for (const row of completed) {
    const key = day(row.occurredAt);
    const current = byDay.get(key) ?? emptyTotals();
    addTo(current, row);
    byDay.set(key, current);
  }
  addSection(
    section(
      [["Date", ...IMPACT_HEADERS], ...[...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, value]) => [key, ...impactCells(value)])],
      [12, 12, 10, 10, 14, 12, 14],
    ),
    "By date",
  );

  const byFood = new Map<string, Totals>();
  for (const row of completed) {
    for (const item of foodItems(row)) {
      const current = byFood.get(item.name) ?? emptyTotals();
      addTo(current, row, item.kg);
      byFood.set(item.name, current);
    }
  }
  addSection(
    section(
      [
        ["#", "Food item", ...IMPACT_HEADERS, "Estimated value"],
        ...[...byFood.entries()]
          .sort((a, b) => b[1].kg - a[1].kg)
          .map(([name, value], index) => [index + 1, name, ...impactCells(value), round(calculateImpact(value.kg).foodValue, 2)]),
      ],
      [4, 30, 12, 10, 10, 14, 12, 14, 14],
    ),
    "Food items",
  );

  addSection(section(collectionRows(orgId, report), [11, 7, 12, 12, 28, 14, 30, 18, 60, 22, 12, 14, 12, 14, 26, 18]), "Collections");

  addSection(
    section(
      [
        ["Listing ID", "Site", "Site ID", "Listed", "Pickup from", "Pickup by", "Food items", "Pathway", "Listed kg", "Remaining kg", "Collected kg", "Status", "Claimed by"],
        ...listings.map((row) => {
          const site = report.siteById.get(row.siteId);
          const collectedKg = (row.claims ?? []).filter((claim) => claim.status === "COLLECTED").reduce((sum, claim) => sum + (claim.collectedKg || 0), 0);
          return [
            row.code,
            row.siteName || site?.name || "",
            site?.siteCode ?? "",
            dateTime(row.createdAt),
            dateTime(row.pickupFromTime),
            dateTime(row.pickupByTime),
            row.items?.length ? row.items.map((item) => `${item.name} (${round(item.totalQtyKg)} kg)`).join(", ") : row.food,
            pathwayLabel(row.pathway),
            round(row.quantityKg),
            round(row.remainingQtyKg ?? 0),
            round(collectedKg),
            statusLabel(listingPillStatus(row)),
            (row.claims ?? []).map((claim) => claim.claimantName).filter(Boolean).join(", "),
          ];
        }),
      ],
      [12, 28, 14, 17, 17, 17, 60, 22, 10, 12, 12, 18, 30],
    ),
    "Listings",
  );

  return { sections, fileBase: fileBase(orgName, siteName, report) };
}

/** Excel and CSV are written from these exact rows so both files always match. */
function reportRows(orgId: string, options: ReportOptions) {
  const { sections, fileBase: name } = buildReport(orgId, options);
  const rows: Cell[][] = [];
  const widths: number[] = [];
  sections.forEach((item, index) => {
    if (index > 0) rows.push([], [item.name.toUpperCase()]);
    rows.push(...item.rows);
    if (index > 0 && item.rows.length <= 1) rows.push(["No records for this period"]);
    item.widths.forEach((width, column) => {
      widths[column] = Math.max(widths[column] ?? 0, width);
    });
  });
  return { rows, widths, name };
}

export function downloadOrgWorkbook(orgId: string, options: ReportOptions) {
  const { rows, widths, name } = reportRows(orgId, options);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet(rows, widths), "Report");
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  download(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${name}.xlsx`);
}

export function downloadOrgCsv(orgId: string, options: ReportOptions) {
  const { rows, name } = reportRows(orgId, options);
  const escape = (cell: Cell) => (typeof cell === "number" ? String(cell) : `"${cell.replace(/"/g, '""')}"`);
  const csv = rows.map((row) => row.map(escape).join(",")).join("\n");
  download(new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
}

function fileBase(orgName: string, siteName: string, report: { startDate?: string; endDate?: string }) {
  const slug = (value: string) => value.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const range = report.startDate && report.endDate ? `${report.startDate}_to_${report.endDate}` : "all-time";
  return ["Saveful", slug(orgName), siteName === "All sites" ? "" : slug(siteName), range].filter(Boolean).join("_");
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminOrgExportDialog({
  orgId,
  orgName,
  period: initialPeriod,
  from: initialFrom,
  to: initialTo,
  onClose,
}: {
  orgId: string;
  orgName: string;
  period: PeriodKey;
  from?: string;
  to?: string;
  onClose: () => void;
}) {
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [siteId, setSiteId] = useState("all");
  const [error, setError] = useState("");
  const sites = buildSitesDirectory({ ...EMPTY_ADMIN_FILTERS, organisationId: orgId, period: "all" }, EMPTY_ADMIN_SITES_FILTERS).rows
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));
  const options = { period, from, to, siteId };

  const run = (action: (id: string, opts: ReportOptions) => void) => {
    setError("");
    try {
      action(orgId, options);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not build the report.");
    }
  };

  if (typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white px-5 pb-5 pt-4 shadow-2xl sm:rounded-2xl sm:px-6">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-saveful-bold text-lg text-gray-900">Export report</h2>
            <p className="mt-0.5 truncate font-saveful text-xs text-gray-500">{orgName} · choose the period and site to include.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="shrink-0 rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <PeriodFilter
            period={period}
            from={from}
            to={to}
            onChange={(next) => {
              setPeriod(next.period);
              setFrom(next.from);
              setTo(next.to);
            }}
          />
          <label className="block min-w-0">
            <span className="mb-1.5 block truncate font-saveful text-[11px] uppercase tracking-[0.12em] text-gray-500">Site</span>
            <div className="relative">
              <select
                value={siteId}
                onChange={(event) => setSiteId(event.target.value)}
                className="h-9 w-full appearance-none truncate rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 pr-8 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40"
              >
                <option value="all">All sites ({sites.length})</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {site.name}
                    {site.siteCode ? ` · ${site.siteCode}` : ""}
                  </option>
                ))}
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-gray-400">
                <ChevronDown className="h-3.5 w-3.5" />
              </span>
            </div>
          </label>

          <div className="rounded-xl border border-black/[0.04] bg-[#F7F6F2] px-3.5 py-3">
            <p className="font-saveful-semibold text-xs text-gray-900">Both downloads include</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {REPORT_PARTS.map((part) => (
                <span key={part} className="rounded-full bg-white px-2 py-0.5 font-saveful text-[11px] text-gray-600 ring-1 ring-black/[0.05]">
                  {part}
                </span>
              ))}
            </div>
            <p className="mt-2 font-saveful text-[11px] text-gray-500">Excel and CSV contain exactly the same rows, in the same order. Pick whichever format you prefer.</p>
          </div>

          {error ? <p className="font-saveful text-sm text-red-600">{error}</p> : null}

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => run(downloadOrgCsv)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border border-black/[0.08] bg-white px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
            >
              <Download className="h-4 w-4" />
              Download CSV
            </button>
            <button
              type="button"
              onClick={() => run(downloadOrgWorkbook)}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-lg bg-saveful-green px-3 font-saveful-semibold text-sm text-white hover:bg-saveful-green/90"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download Excel
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
