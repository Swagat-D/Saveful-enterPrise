"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CheckCircle2, CloudUpload, Download, FileSpreadsheet } from "lucide-react";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import {
  BULK_COLUMNS,
  BULK_TEMPLATE_CSV,
  downloadTextFile,
  errorReportCsv,
  exampleBulkRows,
  parseCsv,
  validateBulkRows,
  type BulkSiteRow,
} from "@/lib/siteBulk";
import { cn } from "@/lib/utils";

type Filter = "all" | "ready" | "attention" | "invites";

export function BulkUploadFlow() {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [parseError, setParseError] = useState("");
  const [rows, setRows] = useState<BulkSiteRow[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [confirming, setConfirming] = useState(false);
  const [imported, setImported] = useState<null | { sites: number; invites: number }>(null);
  const [dragging, setDragging] = useState(false);

  const ready = rows.filter((row) => row.status === "ready");
  const attention = rows.filter((row) => row.status === "attention");
  const invites = ready.filter((row) => row.willInvite);
  const visible = rows.filter((row) => {
    if (filter === "ready") return row.status === "ready";
    if (filter === "attention") return row.status === "attention";
    if (filter === "invites") return row.willInvite && row.status === "ready";
    return true;
  });
  const reviewing = rows.length > 0;

  const resetReview = () => {
    setImported(null);
    setConfirming(false);
    setFilter("all");
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    resetReview();
    setParseError("");
    setFileName(file.name);

    if (/\.xlsx?$/i.test(file.name) && !/\.csv$/i.test(file.name)) {
      setRows([]);
      setParseError("Save the spreadsheet as CSV to review it here.");
      return;
    }

    const records = parseCsv(await file.text());
    if (!records.length) {
      setRows([]);
      setParseError("No site rows found. Keep the header row from the template.");
      return;
    }
    setRows(validateBulkRows(records));
  };

  const loadExample = () => {
    setFileName("example-sites.csv");
    setParseError("");
    resetReview();
    setRows(exampleBulkRows());
  };

  return (
    <PortalShell>
      <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <Link href="/sites" className="hover:text-saveful-green">
            Sites
          </Link>
          <span className="px-1.5 text-gray-300">/</span>
          <span className="text-gray-700">Bulk upload</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="flex flex-col gap-3 border-b border-gray-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="min-w-0">
              <h1 className="font-saveful-bold text-xl leading-none text-gray-900 sm:text-2xl">
                Bulk upload sites
              </h1>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                {reviewing
                  ? `${fileName} · ${ready.length} ready · ${attention.length} held back`
                  : "Download the template, add sites, then review before import."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadTextFile(BULK_TEMPLATE_CSV, "saveful-sites-template.csv")}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                <Download className="h-3.5 w-3.5" />
                Template
              </button>
              <Link
                href="/sites"
                className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
              >
                Cancel
              </Link>
            </div>
          </header>

          {!reviewing ? (
            <div className="p-4 sm:p-6">
              <label
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void handleFile(event.dataTransfer.files[0]);
                }}
                className={cn(
                  "group flex min-h-[240px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition sm:min-h-[280px]",
                  dragging
                    ? "border-saveful-green bg-saveful-green/15 ring-4 ring-saveful-green/15"
                    : "border-saveful-green/55 bg-saveful-green/[0.07] hover:border-saveful-green hover:bg-saveful-green/[0.12]",
                )}
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-saveful-green text-white shadow-sm transition group-hover:scale-[1.03]">
                  <CloudUpload className="h-8 w-8" />
                </span>
                <p className="mt-5 font-saveful-bold text-xl text-gray-900 sm:text-2xl">
                  Drop your completed CSV here
                </p>
                <p className="mt-2 max-w-md font-saveful text-sm text-gray-600">
                  or click to choose a file. We will validate every row before anything is imported.
                </p>
                <span className="mt-6 inline-flex h-11 items-center rounded-xl bg-saveful-green px-6 font-saveful-semibold text-sm text-white shadow-sm transition group-hover:bg-[#256b29]">
                  Choose file
                </span>
                <span className="mt-3 font-saveful text-xs text-gray-500">
                  .csv, .xlsx, or .xls
                </span>
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={(event) => void handleFile(event.target.files?.[0])}
                />
              </label>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="font-saveful text-xs text-gray-500">
                  Required: site name, address. Site ID must be unique if supplied.
                </p>
                <button
                  type="button"
                  onClick={loadExample}
                  className="font-saveful-semibold text-sm text-saveful-green hover:underline"
                >
                  Review an example
                </button>
              </div>
              {parseError ? <p className="mt-3 font-saveful text-sm text-amber-700">{parseError}</p> : null}

              <div className="mt-5 flex flex-wrap gap-1.5">
                {BULK_COLUMNS.map((column) => (
                  <span
                    key={column.key}
                    className="rounded-md bg-[#F7F6F2] px-2 py-1 font-saveful text-[11px] text-gray-500"
                  >
                    {column.label}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-2 border-b border-gray-100 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <label className="flex min-w-0 cursor-pointer items-center gap-2">
                  <CloudUpload className="h-4 w-4 shrink-0 text-saveful-green" />
                  <span className="truncate font-saveful text-sm text-gray-800">{fileName}</span>
                  <span className="shrink-0 font-saveful-semibold text-xs text-saveful-green hover:underline">
                    Replace
                  </span>
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    className="hidden"
                    onChange={(event) => void handleFile(event.target.files?.[0])}
                  />
                </label>
                <div className="flex rounded-lg bg-[#F7F6F2] p-0.5">
                  {(
                    [
                      ["all", `All ${rows.length}`],
                      ["ready", `Ready ${ready.length}`],
                      ["attention", `Issues ${attention.length}`],
                      ["invites", `Invites ${invites.length}`],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFilter(id)}
                      className={cn(
                        "rounded-md px-2.5 py-1 font-saveful-semibold text-xs",
                        filter === id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-800",
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {imported ? (
                <div className="flex flex-col gap-3 border-b border-saveful-green/15 bg-saveful-green/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-saveful-green" />
                    <div>
                      <p className="font-saveful-semibold text-sm text-gray-900">Import complete</p>
                      <p className="mt-0.5 font-saveful text-xs text-gray-600">
                        {imported.sites} added
                        {imported.invites ? ` · ${imported.invites} invitation${imported.invites === 1 ? "" : "s"} sent` : ""}.
                        Past collections keep their original classification.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/sites")}
                    className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
                  >
                    View sites
                  </button>
                </div>
              ) : confirming ? (
                <div className="flex flex-col gap-2 border-b border-amber-100 bg-amber-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <p className="font-saveful text-sm text-gray-800">
                    Import {ready.length} ready {ready.length === 1 ? "site" : "sites"}
                    {attention.length ? ` · skip ${attention.length} with issues` : ""}
                    {invites.length ? ` · send ${invites.length} invitation${invites.length === 1 ? "" : "s"} after` : ""}.
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="h-9 rounded-lg px-3 font-saveful-semibold text-sm text-gray-700 hover:bg-white"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setImported({ sites: ready.length, invites: invites.length });
                        setConfirming(false);
                      }}
                      className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
                    >
                      Confirm import
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="overflow-x-auto">
                <table className="min-w-full text-left">
                  <thead>
                    <tr className="border-b border-gray-100 bg-[#F7F6F2] font-saveful text-[11px] uppercase tracking-wide text-gray-400">
                      <th className="px-4 py-2 font-saveful sm:px-5">Row</th>
                      <th className="py-2 pr-3 font-saveful">Site</th>
                      <th className="py-2 pr-3 font-saveful">Status</th>
                      <th className="py-2 pr-4 font-saveful sm:pr-5">Issue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visible.map((row) => (
                      <tr key={row.row} className="border-b border-gray-50 last:border-0">
                        <td className="px-4 py-2.5 font-saveful text-sm text-gray-400 sm:px-5">{row.row}</td>
                        <td className="py-2.5 pr-3">
                          <p className="font-saveful-semibold text-sm text-gray-900">{row.siteName}</p>
                          <p className="font-saveful text-xs text-gray-500">
                            {row.siteId || "No Site ID"}
                            {row.willInvite ? " · Invite after import" : ""}
                          </p>
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-saveful text-[11px]",
                              row.status === "ready" ? "bg-saveful-green/10 text-saveful-green" : "bg-amber-50 text-amber-700",
                            )}
                          >
                            {row.status === "ready" ? "Ready" : "Needs attention"}
                          </span>
                        </td>
                        <td className="py-2.5 pr-4 font-saveful text-sm text-gray-600 sm:pr-5">
                          {row.issues.join(" · ") || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {!imported ? (
                <div className="flex flex-col gap-2 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                  <button
                    type="button"
                    disabled={!attention.length}
                    onClick={() => downloadTextFile(errorReportCsv(rows), "saveful-site-upload-errors.csv")}
                    className="inline-flex items-center gap-1.5 font-saveful-semibold text-sm text-saveful-green disabled:text-gray-300"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                    Download errors
                  </button>
                  <button
                    type="button"
                    disabled={!ready.length || confirming}
                    onClick={() => setConfirming(true)}
                    className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white disabled:opacity-50"
                  >
                    Import {ready.length} {ready.length === 1 ? "site" : "sites"}
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>
      </PortalPageShell>
    </PortalShell>
  );
}
