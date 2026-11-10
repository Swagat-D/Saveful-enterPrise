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
import { saveReportPdf, type PdfBlock, type PdfReport } from "@/lib/reportPdf";

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

function foodItemsBlock(foods: FoodReportRow[]): PdfBlock {
  return {
    kind: "table",
    title: "Food redistribution by category",
    note: "Breakdown by food item for this period. These amounts make up the totals above — they are not extra.",
    empty: "No per-food-item savings for this period.",
    columns: [
      { label: "#", width: 0.5 },
      { label: "Food item", width: 3.4 },
      { label: "Total", width: 1.1, align: "right" },
      { label: "People", width: 1.1, align: "right" },
      { label: "Animals", width: 1.1, align: "right" },
      { label: "Meals", width: 1, align: "right" },
      { label: "CO₂", width: 1.1, align: "right" },
      { label: "Value", width: 1.1, align: "right" },
    ],
    rows: foods.map((food) => [
      String(food.rank),
      `${food.name}\n${food.category}`,
      `${formatNumber(food.totalKg)} kg`,
      `${formatNumber(food.peopleKg)} kg`,
      `${formatNumber(food.animalKg)} kg`,
      formatNumber(food.mealsCreated),
      `${formatNumber(food.co2AvoidedKg)} kg`,
      `$${formatNumber(food.savedUsd)}`,
    ]),
  };
}

function recipientsBlock(props: ImpactReportProps, recipients: RecipientRow[]): PdfBlock {
  const verb = props.stats.mode === "RECEIVER" ? "collected from" : "donated to";
  return {
    kind: "table",
    title: partnerHeading(props),
    note: `Every organisation you ${verb} in this period, how many times, how much food and what kind.`,
    empty: "No partner organisations for this period.",
    columns: [
      { label: "#", width: 0.5 },
      { label: "Organisation", width: 2.6 },
      { label: "Times", width: 0.8, align: "right" },
      { label: "Food", width: 1.1, align: "right" },
      { label: "Share", width: 0.8, align: "right" },
      { label: "Meals", width: 0.9, align: "right" },
      { label: "CO₂", width: 1, align: "right" },
      { label: "Food types", width: 2.6 },
    ],
    rows: recipients.map((recipient) => {
      const last = formatCollectionDate(recipient.lastCollectionAt);
      const foods = recipient.foods.length
        ? recipient.foods
            .slice(0, 6)
            .map((food) => `${food.name} (${formatNumber(food.totalKg)} kg)`)
            .join(", ")
        : "—";
      return [
        String(recipient.rank),
        `${recipient.name}\n${last ? `Last collection ${last}` : "Collection dates unavailable"}`,
        formatNumber(recipient.collections),
        `${formatNumber(recipient.totalKg)} kg`,
        `${formatNumber(recipient.sharePercent)}%`,
        formatNumber(recipient.mealsCreated),
        `${formatNumber(recipient.co2AvoidedKg)} kg`,
        foods,
      ];
    }),
  };
}

function buildPdfReport(props: ImpactReportProps, foods: FoodReportRow[], recipients: RecipientRow[]): PdfReport {
  const meta = buildReportMeta(props);
  const headings = reportHeadings(props.isFarm);
  const metrics: [string, string][] = metricRows(props.stats).map((row) => [row.label, row.value]);
  if (props.stats.rating != null) {
    metrics.push([
      "Partner rating",
      `${formatNumber(props.stats.rating)} / 5 · ${formatNumber(props.stats.ratingCount)} reviews`,
    ]);
  }
  return {
    filename: `${meta.fileBase}.pdf`,
    eyebrow: headings.brandSub,
    title: meta.title,
    lede: headings.lede,
    meta: [
      ["Prepared for", meta.organisation],
      ["Reporting period", meta.period],
      ...(meta.site ? ([["Site", meta.site]] as [string, string][]) : []),
      ["Generated on", meta.generatedAt],
    ],
    blocks: [
      { kind: "kpis", title: "Impact summary", items: metrics, columns: 4 },
      recipientsBlock(props, recipients),
      foodItemsBlock(foods),
    ],
    footer:
      "Generated by Saveful for Business · Figures reflect completed collections during the selected period. Impact estimates are calculated using standard conversion factors.",
  };
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
  await saveReportPdf(buildPdfReport(props, foods, recipients));
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
