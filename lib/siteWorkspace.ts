import { inDateRange, periodRange } from "@/lib/dates";
import { formatKg } from "@/lib/impact";
import { formatCollectionHours } from "@/lib/siteForm";
import { recoveryTransactions } from "@/lib/network";
import { PATHWAY_LABEL } from "@/lib/networkQuery";
import { formatLastActivity } from "@/lib/networkRules";
import { demoActivity } from "@/lib/demo";
import type { OrganizationSite, PeriodKey, RecoveryPathway, RecoveryTransaction } from "@/types/enterprise";

const FOOD_BY_PATHWAY: Record<RecoveryPathway, string[]> = {
  people: ["Prepared meals", "Bread and pastries", "Fresh produce", "Dairy surplus"],
  livestock: ["Vegetable trimmings", "Food scraps", "Bakery leftovers"],
  circular: ["Used cooking oil", "Coffee grounds"],
  bioenergy: ["Mixed surplus", "Organic waste"],
};

const INSTRUCTIONS: Record<string, string> = {
  hq: "Enter via rear loading dock. Ask for the kitchen manager.",
  "2": "Collection from Crown Street laneway. Buzz Surry Hills Kitchen.",
  "3": "Use the Church Street service door. Call ahead if arriving after 4pm.",
  "bondi-kitchen": "Pickup from the Campbell Parade side entrance.",
  "paddington-kitchen": "Ask for the kitchen lead at the Oxford Street dock.",
};

export function siteOperations(site: OrganizationSite) {
  const days = site.collectionDays ?? ["mon", "tue", "wed", "thu", "fri"];
  const from = site.collectionFrom ?? "14:00";
  const to = site.collectionTo ?? "17:00";
  return {
    primaryContact: site.primaryContact || (site.hasManager ? site.managerName : "Not assigned"),
    siteAdmin: site.hasManager ? site.managerName : "Harbour Kitchen HQ",
    collectionHours: formatCollectionHours(days, from, to),
    collectionInstructions:
      site.collectionInstructions ||
      INSTRUCTIONS[site.id] ||
      "Ask for the kitchen manager on arrival. Historical recovery records stay unchanged if this site is reassigned.",
  };
}

export function foodLabelFor(row: RecoveryTransaction) {
  const options = FOOD_BY_PATHWAY[row.pathway];
  const index = row.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0) % options.length;
  return options[index];
}

export function siteRecoveryRows(siteId: string, period: PeriodKey, limit = 6) {
  const { startDate, endDate } = periodRange(period);
  return recoveryTransactions
    .filter((row) => row.snapshot.siteId === siteId && inDateRange(row.occurredAt, startDate, endDate))
    .slice(0, limit)
    .map((row) => {
      const days = formatLastActivity(row.occurredAt);
      return {
        id: row.id,
        date: new Date(row.occurredAt).toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        activity: PATHWAY_LABEL[row.pathway],
        food: foodLabelFor(row),
        quantity: formatKg(row.kg),
        recipient: row.recipientName,
        status: days === "Today" || days === "Yesterday" ? "Claimed" : "Completed",
        snapshot: row.snapshot,
      };
    });
}


export function activityForSite(siteId?: string) {
  const events = demoActivity.filter((item) => !siteId || item.siteId === siteId);
  const collections = recoveryTransactions
    .filter((row) => !siteId || row.snapshot.siteId === siteId)
    .slice(0, siteId ? 20 : 8)
    .map((row) => ({
      id: row.id,
      time: formatLastActivity(row.occurredAt),
      title: `${row.snapshot.siteName} collection completed`,
      body: `${formatKg(row.kg)} went to ${row.recipientName}. Group, territory and cluster stay as they were at collection.`,
      site: row.snapshot.siteName,
      siteId: row.snapshot.siteId,
      type: "Collection" as const,
    }));

  const seen = new Set(events.map((item) => `${item.siteId}-${item.title}`));
  const extra = collections.filter((item) => !seen.has(`${item.siteId}-${item.title}`));
  return [...events, ...extra];
}

export const SITE_TABS = [
  { id: "overview", label: "Overview" },
  { id: "activity", label: "Activity" },
  { id: "insights", label: "Insights" },
  { id: "access", label: "Users & Access" },
] as const;

export type SiteTab = (typeof SITE_TABS)[number]["id"];

export function parseSiteTab(value: string | null): SiteTab {
  if (value === "activity" || value === "insights" || value === "access") return value;
  return "overview";
}
