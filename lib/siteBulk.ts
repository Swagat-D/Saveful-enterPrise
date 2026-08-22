import { demoSites } from "@/lib/demo";
import { listUsers } from "@/lib/users";
import { listActiveUnits } from "@/lib/orgStructure";
import { isSiteCodeTaken } from "@/lib/siteForm";

export const BULK_COLUMNS = [
  { key: "site_name", label: "Site name*", required: true },
  { key: "site_id", label: "Site ID / Code" },
  { key: "address", label: "Address*", required: true },
  { key: "primary_contact", label: "Primary contact name" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "group", label: "Group" },
  { key: "territory", label: "Territory" },
  { key: "cluster", label: "Cluster" },
  { key: "collection_days", label: "Collection days" },
  { key: "collection_start", label: "Collection start time" },
  { key: "collection_end", label: "Collection end time" },
  { key: "collection_instructions", label: "Collection instructions" },
  { key: "site_admin_email", label: "Site Admin email" },
] as const;

export type BulkRowStatus = "ready" | "attention";

export type BulkSiteRow = {
  row: number;
  siteName: string;
  siteId: string;
  address: string;
  group: string;
  territory: string;
  cluster: string;
  adminEmail: string;
  status: BulkRowStatus;
  issues: string[];
  willInvite: boolean;
};

const TEMPLATE_ROWS = [
  [
    "Bondi Pavilion Cafe",
    "BP-002",
    "1 Queen Elizabeth Dr, Bondi NSW 2026",
    "Maya Chen",
    "bondi.pavilion@harbourkitchen.com",
    "0412 111 222",
    "Harbour Cafe",
    "Eastern Suburbs",
    "Bondi",
    "Mon,Tue,Wed,Thu,Fri",
    "2:00 PM",
    "5:00 PM",
    "Enter via rear dock. Ask for kitchen manager.",
    "maya.chen@harbourkitchen.com",
  ],
];

export const BULK_TEMPLATE_CSV = [
  BULK_COLUMNS.map((column) => column.key).join(","),
  ...TEMPLATE_ROWS.map((row) => row.map(csvEscape).join(",")),
].join("\n");

export function parseCsv(text: string): Record<string, string>[] {
  const rows = splitCsv(text).filter((row) => row.some((cell) => cell.trim()));
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase().replace(/[*\s/]+/g, "_"));
  return rows.slice(1).map((cells) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = (cells[index] ?? "").trim();
    });
    return record;
  });
}

export function validateBulkRows(records: Record<string, string>[]): BulkSiteRow[] {
  const seenCodes = new Map<string, number>();

  return records.map((record, index) => {
    const row = index + 2;
    const siteName = pick(record, ["site_name", "name"]);
    const siteId = pick(record, ["site_id", "site_id_code", "code"]);
    const address = pick(record, ["address"]);
    const group = pick(record, ["group"]);
    const territory = pick(record, ["territory"]);
    const cluster = pick(record, ["cluster"]);
    const adminEmail = pick(record, ["site_admin_email", "admin_email"]);
    const issues: string[] = [];

    if (!siteName) issues.push("Site name required");
    if (!address) issues.push("Address required");

    if (siteId) {
      const key = siteId.toLowerCase();
      if (seenCodes.has(key)) issues.push("Duplicate Site ID in this file");
      else seenCodes.set(key, row);
      if (isSiteCodeTaken(siteId)) issues.push("Duplicate Site ID");
    }

    if (group && !matchUnit(listActiveUnits("group"), group)) issues.push("Group not recognised");
    if (territory && !matchUnit(listActiveUnits("territory"), territory)) issues.push("Territory not recognised");
    if (cluster && !matchUnit(listActiveUnits("cluster"), cluster)) issues.push("Cluster not recognised");

    const existingUser = adminEmail
      ? listUsers().some((user) => user.email.toLowerCase() === adminEmail.toLowerCase())
      : false;
    const willInvite = Boolean(adminEmail) && !existingUser;

    return {
      row,
      siteName: siteName || `Row ${row}`,
      siteId,
      address,
      group,
      territory,
      cluster,
      adminEmail,
      status: issues.length ? "attention" : "ready",
      issues,
      willInvite,
    };
  });
}

export function errorReportCsv(rows: BulkSiteRow[]) {
  const header = "row,site,status,issue,site_id,address";
  const body = rows
    .filter((row) => row.status === "attention")
    .map((row) =>
      [String(row.row), row.siteName, "Needs attention", row.issues.join("; "), row.siteId, row.address]
        .map(csvEscape)
        .join(","),
    );
  return [header, ...body].join("\n");
}

export function exampleBulkRows(): BulkSiteRow[] {
  return validateBulkRows([
    {
      site_name: "Bondi Pavilion Cafe",
      site_id: "BP-002",
      address: "1 Queen Elizabeth Dr, Bondi NSW 2026",
      group: "Harbour Cafe",
      territory: "Eastern Suburbs",
      cluster: "Bondi",
      site_admin_email: "priya@harbourkitchen.com",
    },
    {
      site_name: "Adelaide Campus",
      site_id: "AC-010",
      address: "12 North Terrace, Adelaide SA 5000",
      group: "Harbour Kitchen",
      territory: "South Australia",
      cluster: "",
      site_admin_email: "new.admin@harbourkitchen.com",
    },
    {
      site_name: "",
      site_id: "HK-HQ",
      address: "",
      group: "Harbour Kitchen",
      territory: "Sydney CBD",
      cluster: "Circular Quay",
    },
    {
      site_name: "Rozelle Kiosk",
      site_id: "RZ-KSK-1",
      address: "44 Darling Street, Rozelle NSW 2039",
      group: "Harbour Kitchen",
      territory: "Eastern Suburbs",
      site_admin_email: "kiosk.admin@harbourkitchen.com",
    },
  ]);
}

export function downloadTextFile(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function matchUnit(units: { name: string }[], value: string) {
  const needle = value.trim().toLowerCase();
  return units.some((unit) => unit.name.toLowerCase() === needle);
}

function pick(record: Record<string, string>, keys: string[]) {
  for (const key of keys) {
    if (record[key]) return record[key];
  }
  return "";
}

function csvEscape(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function splitCsv(text: string) {
  const rows: string[][] = [];
  let current: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      current.push(cell);
      cell = "";
    } else if (char === "\n") {
      current.push(cell);
      rows.push(current);
      current = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  if (cell || current.length) {
    current.push(cell);
    rows.push(current);
  }
  return rows;
}


