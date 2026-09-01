import * as XLSX from "xlsx";
import { IMPACT } from "@/lib/impact";
import {
  fetchRecipientRows,
  foodLabel,
  foodSavedUsdFromKg,
  formatCollectionDate,
  getOrgTopFoods,
  getSiteTopFoods,
  rangeParamsFromFilter,
  unwrapTopFoods,
  type ImpactDisplayStats,
  type ImpactFilter,
  type RecipientRow,
  type TopFoodItem,
} from "@/lib/businessImpact";

export type ImpactReportProps = {
  stats: ImpactDisplayStats;
  filter: ImpactFilter;
  filterLabel: string;
  siteId?: number | null;
  siteLabel?: string | null;
  organisationName?: string | null;
  isFarm?: boolean;
};

type FoodReportRow = {
  rank: number;
  name: string;
  category: string;
  totalKg: number;
  peopleKg: number;
  animalKg: number;
  mealsCreated: number;
  co2AvoidedKg: number;
  savedUsd: number;
};

function formatNumber(value: number) {
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function slugDate() {
  return new Date().toISOString().slice(0, 10);
}

function resolveFoodSplit(
  food: TopFoodItem,
  fallbackPeoplePercent: number,
  fallbackAnimalPercent: number,
) {
  const total = Number(food.totalKg) || 0;
  if (total <= 0) {
    return { peopleKg: 0, animalKg: 0 };
  }

  const hasPerFoodSplit =
    food.peopleKg != null ||
    food.animalKg != null ||
    food.peoplePercent != null ||
    food.animalPercent != null;

  if (hasPerFoodSplit) {
    let peopleKg =
      food.peopleKg != null
        ? Number(food.peopleKg)
        : round2((total * Number(food.peoplePercent ?? 0)) / 100);
    let animalKg =
      food.animalKg != null
        ? Number(food.animalKg)
        : round2((total * Number(food.animalPercent ?? 0)) / 100);

    if (peopleKg + animalKg <= 0) {
      peopleKg = total;
      animalKg = 0;
    }

    return { peopleKg: round2(peopleKg), animalKg: round2(animalKg) };
  }

  const peoplePct = Math.max(0, Math.min(100, fallbackPeoplePercent));
  const animalPct = Math.max(0, Math.min(100, fallbackAnimalPercent));
  const pctSum = peoplePct + animalPct;
  const safePeople = pctSum > 0 ? peoplePct : 100;
  const safeAnimal = pctSum > 0 ? animalPct : 0;

  return {
    peopleKg: round2((total * safePeople) / 100),
    animalKg: round2((total * safeAnimal) / 100),
  };
}

function toFoodReportRows(foods: TopFoodItem[], stats: ImpactDisplayStats): FoodReportRow[] {
  return foods.map((food, index) => {
    const totalKg = round2(Number(food.totalKg) || 0);
    const split = resolveFoodSplit(food, stats.peoplePercent, stats.animalPercent);
    return {
      rank: food.rank || index + 1,
      name: foodLabel(food),
      category: food.category?.trim() || "—",
      totalKg,
      peopleKg: split.peopleKg,
      animalKg: split.animalKg,
      mealsCreated: round2(Number(food.mealsCreated) || 0),
      co2AvoidedKg: round2(food.co2AvoidedKg != null ? Number(food.co2AvoidedKg) : totalKg * IMPACT.CO2_PER_KG),
      savedUsd: foodSavedUsdFromKg(totalKg),
    };
  });
}

function buildReportMeta(props: ImpactReportProps) {
  const generatedAt = new Date().toLocaleString("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return {
    title: "Impact Report",
    organisation: props.organisationName?.trim() || "Organisation",
    site: props.siteLabel?.trim() || null,
    period: props.filterLabel,
    generatedAt,
    fileBase: `Saveful_Impact_Report_${slugDate()}`,
  };
}

function metricRows(stats: ImpactDisplayStats) {
  return [
    { label: "Food redistributed", value: `${formatNumber(stats.redistributedKg)} kg` },
    { label: "Meals created", value: formatNumber(stats.mealsCreated) },
    { label: "CO₂ emissions avoided", value: `${formatNumber(stats.co2AvoidedKg)} kg` },
    { label: "Food saved value", value: `$${formatNumber(stats.foodSavedMoney)}` },
    { label: "Collections completed", value: formatNumber(stats.collectionsCompleted) },
    { label: "Partners supported", value: formatNumber(stats.partnersSupported) },
    {
      label: "Food for people",
      value: `${formatNumber(stats.peopleKg)} kg (${formatNumber(stats.peoplePercent)}%)`,
    },
    {
      label: "Food for animals",
      value: `${formatNumber(stats.animalKg)} kg (${formatNumber(stats.animalPercent)}%)`,
    },
  ];
}

async function fetchFoodSavings(props: ImpactReportProps, orgId: number | null): Promise<FoodReportRow[]> {
  if (props.siteId == null && orgId == null) return [];
  const rangeParams = rangeParamsFromFilter(props.filter);
  const res =
    props.siteId != null
      ? await getSiteTopFoods(props.siteId, rangeParams)
      : await getOrgTopFoods(Number(orgId), rangeParams);
  return toFoodReportRows(unwrapTopFoods(res), props.stats);
}

function partnerHeading(props: ImpactReportProps) {
  return props.stats.mode === "RECEIVER" ? "Collected from" : "Recipient Organisations";
}

function reportHeadings(isFarm?: boolean) {
  if (isFarm) {
    return {
      brandSub: "Impact Reporting",
      lede: "A summary of your food redistribution, social, environmental and operational impact for the selected reporting period.",
    };
  }
  return {
    brandSub: "IMPACT & ESG SUMMARY",
    lede: "A management-ready snapshot of food redistribution impact for the selected period, including per-food-item savings.",
  };
}

function buildFoodItemsHtml(foods: FoodReportRow[]) {
  if (!foods.length) {
    return `
      <h2>Food redistribution by category</h2>
      <p class="empty">No per-food-item savings for this period.</p>
    `;
  }

  const rows = foods
    .map(
      (food) => `
      <tr>
        <td class="rank">${food.rank}</td>
        <td>
          <div class="food-name">${escapeHtml(food.name)}</div>
          <div class="food-cat">${escapeHtml(food.category)}</div>
        </td>
        <td class="value">${escapeHtml(formatNumber(food.totalKg))} kg</td>
        <td class="value">${escapeHtml(formatNumber(food.peopleKg))} kg</td>
        <td class="value">${escapeHtml(formatNumber(food.animalKg))} kg</td>
        <td class="value">${escapeHtml(formatNumber(food.mealsCreated))}</td>
        <td class="value">${escapeHtml(formatNumber(food.co2AvoidedKg))} kg</td>
        <td class="value">$${escapeHtml(formatNumber(food.savedUsd))}</td>
      </tr>`,
    )
    .join("");

  return `
    <h2>Food redistribution by category</h2>
    <p class="section-note">
      Breakdown by food item for this period. These amounts make up the totals above — they are not extra.
    </p>
    <table class="foods">
      <thead>
        <tr>
          <th>#</th>
          <th>Food item</th>
          <th style="text-align:right">Total</th>
          <th style="text-align:right">People</th>
          <th style="text-align:right">Animals</th>
          <th style="text-align:right">Meals</th>
          <th style="text-align:right">CO₂</th>
          <th style="text-align:right">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

function buildRecipientsHtml(props: ImpactReportProps, recipients: RecipientRow[]) {
  const heading = partnerHeading(props);

  if (!recipients.length) {
    return `
      <h2>${escapeHtml(heading)}</h2>
      <p class="empty">No partner organisations for this period.</p>
    `;
  }

  const rows = recipients
    .map((recipient) => {
      const foods = recipient.foods.length
        ? recipient.foods
            .slice(0, 6)
            .map((food) => `${escapeHtml(food.name)} (${escapeHtml(formatNumber(food.totalKg))} kg)`)
            .join(", ")
        : "—";
      const last = formatCollectionDate(recipient.lastCollectionAt);

      return `
      <tr>
        <td class="rank">${recipient.rank}</td>
        <td>
          <div class="food-name">${escapeHtml(recipient.name)}</div>
          <div class="food-cat">${last ? `Last collection ${escapeHtml(last)}` : "Collection dates unavailable"}</div>
        </td>
        <td class="value">${escapeHtml(formatNumber(recipient.collections))}</td>
        <td class="value">${escapeHtml(formatNumber(recipient.totalKg))} kg</td>
        <td class="value">${escapeHtml(formatNumber(recipient.sharePercent))}%</td>
        <td class="value">${escapeHtml(formatNumber(recipient.mealsCreated))}</td>
        <td class="value">${escapeHtml(formatNumber(recipient.co2AvoidedKg))} kg</td>
        <td class="foods-cell">${foods}</td>
      </tr>`;
    })
    .join("");

  const verb = props.stats.mode === "RECEIVER" ? "collected from" : "donated to";

  return `
    <h2>${escapeHtml(heading)}</h2>
    <p class="section-note">
      Every organisation you ${escapeHtml(verb)} in this period, how many times, how much food and what kind.
    </p>
    <table class="foods">
      <thead>
        <tr>
          <th>#</th>
          <th>Organisation</th>
          <th style="text-align:right">Times</th>
          <th style="text-align:right">Food</th>
          <th style="text-align:right">Share</th>
          <th style="text-align:right">Meals</th>
          <th style="text-align:right">CO₂</th>
          <th>Food types</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
}

export function buildPdfHtml(props: ImpactReportProps, foods: FoodReportRow[], recipients: RecipientRow[]) {
  const meta = buildReportMeta(props);
  const headings = reportHeadings(props.isFarm);
  const rows = metricRows(props.stats)
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.label)}</td>
        <td class="value">${escapeHtml(row.value)}</td>
      </tr>`,
    )
    .join("");

  const ratingHtml =
    props.stats.rating != null
      ? `<div class="rating">Partner rating: <strong>${escapeHtml(
          formatNumber(props.stats.rating),
        )}</strong> / 5 · ${escapeHtml(formatNumber(props.stats.ratingCount))} reviews</div>`
      : "";

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(meta.title)}</title>
  <style>
    @page { margin: 24px; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      color: #1A1A1B;
      background: #FFFAF3;
    }
    .page {
      padding: 24px 20px 28px;
      background: #FEFFED;
    }
    .brand {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 12px;
      margin-bottom: 22px;
      padding-bottom: 14px;
      border-bottom: 2px solid #3A7E52;
    }
    .brand-left { flex: 1; min-width: 0; }
    .brand-center { flex: 0 0 auto; display: flex; justify-content: center; align-items: center; }
    .brand-right { flex: 1; display: flex; justify-content: flex-end; align-items: flex-start; }
    .brand-logo { height: 52px; width: auto; max-width: 180px; object-fit: contain; display: block; }
    .brand-mark { font-size: 20px; font-weight: 800; color: #4B2176; }
    .brand-sub { margin-top: 4px; font-size: 11px; color: #575757; text-transform: uppercase; letter-spacing: 1.1px; }
    .chip {
      background: #96F0B6;
      color: #1A1A1B;
      font-size: 11px;
      font-weight: 700;
      padding: 8px 12px;
      border-radius: 999px;
      white-space: nowrap;
    }
    h1 { margin: 0 0 8px; font-size: 26px; line-height: 1.15; }
    h2 { margin: 28px 0 8px; font-size: 18px; color: #4B2176; }
    .lede, .section-note, .empty { margin: 0 0 18px; font-size: 13px; line-height: 1.45; color: #575757; }
    .meta {
      margin-bottom: 20px;
      padding: 14px 8px 4px;
      background: #FFFCF9;
      border: 1px solid #EEE4D7;
      border-radius: 14px;
      overflow: hidden;
    }
    .meta-item { display: inline-block; width: 48%; vertical-align: top; padding: 0 8px 12px; }
    .meta-item label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: 0.8px; color: #6D6D72; margin-bottom: 4px; }
    .meta-item div { font-size: 13px; font-weight: 650; }
    table {
      width: 100%;
      border-collapse: collapse;
      background: #FFFCF9;
      border-radius: 14px;
      overflow: hidden;
      border: 1px solid #EEE4D7;
    }
    th {
      text-align: left;
      font-size: 10px;
      text-transform: uppercase;
      letter-spacing: 0.7px;
      color: #FEFFED;
      background: #3A7E52;
      padding: 10px 10px;
    }
    td { padding: 11px 10px; border-top: 1px solid #EEE4D7; font-size: 12px; vertical-align: top; }
    tr:nth-child(even) td { background: #FEFFED; }
    td.value { text-align: right; font-weight: 700; color: #4B2176; white-space: nowrap; }
    td.rank { width: 28px; font-weight: 700; color: #3A7E52; }
    .food-name { font-weight: 700; color: #1A1A1B; }
    .food-cat { margin-top: 2px; font-size: 11px; color: #6D6D72; }
    table.foods th, table.foods td { font-size: 11px; padding: 9px 8px; }
    td.foods-cell { font-size: 10px; color: #575757; line-height: 1.4; }
    .rating { margin-top: 16px; padding: 11px 12px; background: #FFCDF5; border-radius: 12px; font-size: 12px; }
    .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #EEE4D7; font-size: 10px; color: #6D6D72; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="page">
    <div class="brand">
      <div class="brand-left">
        <div class="brand-mark">Saveful for Business</div>
        <div class="brand-sub">${escapeHtml(headings.brandSub)}</div>
      </div>
      <div class="brand-center"><img class="brand-logo" src="${typeof window !== "undefined" ? `${window.location.origin}/logo.png` : "/logo.png"}" alt="Saveful for Business" /></div>
      <div class="brand-right">
        <div class="chip">Confidential</div>
      </div>
    </div>

    <h1>${escapeHtml(meta.title)}</h1>
    <p class="lede">
      ${escapeHtml(headings.lede)}
    </p>

    <div class="meta">
      <div class="meta-item">
        <label>PREPARED FOR</label>
        <div>${escapeHtml(meta.organisation)}</div>
      </div>
      <div class="meta-item">
        <label>REPORTING PERIOD</label>
        <div>${escapeHtml(meta.period)}</div>
      </div>
      ${
        meta.site
          ? `<div class="meta-item"><label>Site</label><div>${escapeHtml(meta.site)}</div></div>`
          : ""
      }
      <div class="meta-item">
        <label>GENERATED ON</label>
        <div>${escapeHtml(meta.generatedAt)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Metric</th>
          <th style="text-align:right">Value</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    ${ratingHtml}
    ${buildRecipientsHtml(props, recipients)}
    ${buildFoodItemsHtml(foods)}

    <div class="footer">
      Generated by Saveful for Business · Figures reflect completed collections during the selected period.
      Impact estimates are calculated using standard conversion factors.
    </div>
  </div>
</body>
</html>`;
}

function buildExcelWorkbook(props: ImpactReportProps, foods: FoodReportRow[], recipients: RecipientRow[]) {
  const meta = buildReportMeta(props);
  const workbook = XLSX.utils.book_new();

  const summaryRows: Array<Array<string | number>> = [
    ["Saveful for Business — Impact Report"],
    [],
    ["Organisation", meta.organisation],
    ...(meta.site ? [["Site", meta.site] as Array<string>] : []),
    ["Period", meta.period],
    ["Generated", meta.generatedAt],
    [],
    ["Metric", "Value"],
    ...metricRows(props.stats).map((row) => [row.label, row.value]),
  ];

  if (props.stats.rating != null) {
    summaryRows.push([]);
    summaryRows.push(["Partner rating", `${formatNumber(props.stats.rating)} / 5`]);
    summaryRows.push(["Review count", props.stats.ratingCount]);
  }

  summaryRows.push([]);
  summaryRows.push([
    "Notes",
    props.isFarm
      ? "Generated in Saveful for Business for the selected reporting period."
      : "Generated in Saveful for Business for management & ESG use.",
  ]);

  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 28 }, { wch: 28 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Impact");

  const heading = partnerHeading(props);
  const recipientRows: Array<Array<string | number>> = [
    [heading],
    [
      props.stats.mode === "RECEIVER"
        ? "Organisations you collected from in this period."
        : "Organisations that collected your food in this period.",
    ],
    [],
    [
      "#",
      "Organisation",
      "Collections",
      "Total kg",
      "Share %",
      "People kg",
      "Animals kg",
      "Meals created",
      "CO₂ avoided kg",
      "First collection",
      "Last collection",
      "Food types",
    ],
    ...(recipients.length
      ? recipients.map((recipient) => [
          recipient.rank,
          recipient.name,
          recipient.collections,
          recipient.totalKg,
          recipient.sharePercent,
          recipient.peopleKg,
          recipient.animalKg,
          recipient.mealsCreated,
          recipient.co2AvoidedKg,
          formatCollectionDate(recipient.firstCollectionAt) ?? "—",
          formatCollectionDate(recipient.lastCollectionAt) ?? "—",
          recipient.foods.length
            ? recipient.foods.map((food) => `${food.name} (${formatNumber(food.totalKg)} kg)`).join(", ")
            : "—",
        ])
      : [["—", "No partner organisations for this period", "", "", "", "", "", "", "", "", "", ""]]),
  ];

  const recipientsSheet = XLSX.utils.aoa_to_sheet(recipientRows);
  recipientsSheet["!cols"] = [
    { wch: 4 },
    { wch: 28 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 16 },
    { wch: 48 },
  ];
  XLSX.utils.book_append_sheet(workbook, recipientsSheet, heading);

  const breakdownRows: Array<Array<string | number>> = [
    ["Organisation", "Food item", "Category", "Total kg"],
    ...recipients.flatMap((recipient) =>
      recipient.foods.map((food) => [recipient.name, food.name, food.category ?? "—", food.totalKg]),
    ),
  ];

  if (breakdownRows.length > 1) {
    const breakdownSheet = XLSX.utils.aoa_to_sheet(breakdownRows);
    breakdownSheet["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 16 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(workbook, breakdownSheet, "Partner food detail");
  }

  const foodRows: Array<Array<string | number>> = [
    ["Specific Food Savings"],
    ["These amounts make up the totals — they are not extra."],
    [],
    ["#", "Food item", "Category", "Total kg", "People kg", "Animals kg", "Meals created", "CO₂ avoided kg", "Value USD"],
    ...(foods.length
      ? foods.map((food) => [
          food.rank,
          food.name,
          food.category,
          food.totalKg,
          food.peopleKg,
          food.animalKg,
          food.mealsCreated,
          food.co2AvoidedKg,
          food.savedUsd,
        ])
      : [["—", "No per-food-item savings for this period", "", "", "", "", "", "", ""]]),
  ];

  const foodsSheet = XLSX.utils.aoa_to_sheet(foodRows);
  foodsSheet["!cols"] = [
    { wch: 4 },
    { wch: 24 },
    { wch: 16 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, foodsSheet, "Food items");

  return { workbook, fileBase: meta.fileBase };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function loadImpactReportData(props: ImpactReportProps, orgId: number | null) {
  const [foods, recipients] = await Promise.all([
    fetchFoodSavings(props, orgId).catch(() => [] as FoodReportRow[]),
    fetchRecipientRows({
      filter: props.filter,
      siteId: props.siteId,
      orgId,
    }).catch(() => [] as RecipientRow[]),
  ]);
  return { foods, recipients };
}

export async function downloadImpactPdf(props: ImpactReportProps, orgId: number | null) {
  const { foods, recipients } = await loadImpactReportData(props, orgId);
  const html = buildPdfHtml(props, foods, recipients);
  const win = window.open("", "_blank");
  if (!win) throw new Error("Could not open the report window.");
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export async function downloadImpactExcel(props: ImpactReportProps, orgId: number | null) {
  const { foods, recipients } = await loadImpactReportData(props, orgId);
  const { workbook, fileBase } = buildExcelWorkbook(props, foods, recipients);
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  downloadBlob(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
    `${fileBase}.xlsx`,
  );
}
