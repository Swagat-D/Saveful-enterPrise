import { daysAgoIso, DEMO_TODAY, toApiDate } from "@/lib/dates";
import type {
  OrgUnit,
  OrganizationSite,
  OrganizationSnapshot,
  RecoveryPathway,
  RecoveryTransaction,
} from "@/types/enterprise";

export const demoGroups: OrgUnit[] = [
  { id: "kitchen", name: "Harbour Kitchen" },
  { id: "cafe", name: "Harbour Cafe" },
  { id: "catering", name: "Harbour Catering" },
  { id: "events", name: "Harbour Events" },
];

export const demoTerritories: OrgUnit[] = [
  { id: "cbd", name: "Sydney CBD" },
  { id: "east", name: "Eastern Suburbs" },
  { id: "west", name: "Greater West" },
  { id: "north", name: "North Shore" },
];

export const demoClusters: OrgUnit[] = [
  { id: "quay", name: "Circular Quay" },
  { id: "inner", name: "Inner City" },
  { id: "bondi", name: "Bondi" },
  { id: "parra", name: "Parramatta" },
  { id: "northsyd", name: "North Sydney" },
  { id: "liverpool", name: "Liverpool" },
];

const groupName = (id?: string | null) =>
  id ? demoGroups.find((item) => item.id === id)?.name ?? id : "Unassigned";
const territoryName = (id?: string | null) =>
  id ? demoTerritories.find((item) => item.id === id)?.name ?? id : "Unassigned";
const clusterName = (id?: string | null) =>
  id ? demoClusters.find((item) => item.id === id)?.name ?? id : "Unassigned";

type SiteSeed = Omit<OrganizationSite, "lastActivityAt" | "lastListingAt" | "siteCode" | "status"> & {
  lastActivityAt?: string | null;
  lastListingAt?: string | null;
};

const seeds: SiteSeed[] = [
  {
    id: "hq",
    siteType: "head_office",
    name: "Harbour Kitchen HQ",
    address: "14 Circular Quay, Sydney NSW",
    postCode: "2000",
    managerName: "Head office",
    email: "hq@harbourkitchen.com",
    mobile: "+61 400 111 222",
    hasManager: true,
    isDefault: true,
    groupId: "kitchen",
    territoryId: "cbd",
    clusterId: "quay",
    activatedAt: daysAgoIso(400),
  },
  {
    id: "2",
    parentId: "hq",
    siteType: "branch",
    name: "Surry Hills Kitchen",
    address: "88 Crown Street, Surry Hills NSW",
    postCode: "2010",
    managerName: "Priya Nair",
    email: "surryhills@harbourkitchen.com",
    mobile: "+61 400 333 444",
    hasManager: true,
    isDefault: false,
    groupId: "kitchen",
    territoryId: "cbd",
    clusterId: "inner",
    activatedAt: daysAgoIso(280),
  },
  {
    id: "3",
    parentId: "hq",
    siteType: "branch",
    name: "Parramatta Cafe",
    address: "21 Church Street, Parramatta NSW",
    postCode: "2150",
    managerName: "No manager assigned",
    email: "-",
    mobile: "-",
    hasManager: false,
    isDefault: false,
    groupId: "cafe",
    territoryId: "west",
    clusterId: "parra",
    activatedAt: daysAgoIso(90),
  },
  {
    id: "bondi-kitchen",
    parentId: "hq",
    siteType: "branch",
    name: "Bondi Kitchen",
    address: "12 Campbell Parade, Bondi NSW",
    postCode: "2026",
    managerName: "Maya Chen",
    email: "bondi@harbourkitchen.com",
    mobile: "+61 400 555 101",
    hasManager: true,
    isDefault: false,
    groupId: "kitchen",
    territoryId: "east",
    clusterId: "bondi",
    activatedAt: daysAgoIso(200),
  },
  {
    id: "paddington-kitchen",
    parentId: "hq",
    siteType: "branch",
    name: "Paddington Kitchen",
    address: "40 Oxford Street, Paddington NSW",
    postCode: "2021",
    managerName: "Tom Walsh",
    email: "paddington@harbourkitchen.com",
    mobile: "+61 400 555 102",
    hasManager: true,
    isDefault: false,
    groupId: "kitchen",
    territoryId: "east",
    clusterId: "bondi",
    activatedAt: daysAgoIso(160),
  },
  {
    id: "north-kitchen",
    parentId: "hq",
    siteType: "branch",
    name: "North Sydney Kitchen",
    address: "8 Miller Street, North Sydney NSW",
    postCode: "2060",
    managerName: "Elena Voss",
    email: "northsyd@harbourkitchen.com",
    mobile: "+61 400 555 103",
    hasManager: true,
    isDefault: false,
    groupId: "kitchen",
    territoryId: "north",
    clusterId: "northsyd",
    activatedAt: daysAgoIso(140),
  },
  {
    id: "parra-kitchen",
    parentId: "hq",
    siteType: "branch",
    name: "Parramatta Kitchen",
    address: "5 Church Street, Parramatta NSW",
    postCode: "2150",
    managerName: "Daniel Cho",
    email: "parrakitchen@harbourkitchen.com",
    mobile: "+61 400 555 104",
    hasManager: true,
    isDefault: false,
    groupId: "kitchen",
    territoryId: "west",
    clusterId: "parra",
    activatedAt: daysAgoIso(120),
  },
  {
    id: "quay-cafe",
    parentId: "hq",
    siteType: "branch",
    name: "Quay Cafe",
    address: "2 Alfred Street, Sydney NSW",
    postCode: "2000",
    managerName: "Sofia Lane",
    email: "quaycafe@harbourkitchen.com",
    mobile: "+61 400 555 201",
    hasManager: true,
    isDefault: false,
    groupId: "cafe",
    territoryId: "cbd",
    clusterId: "quay",
    activatedAt: daysAgoIso(210),
  },
  {
    id: "newtown-cafe",
    parentId: "hq",
    siteType: "branch",
    name: "Newtown Cafe",
    address: "130 King Street, Newtown NSW",
    postCode: "2042",
    managerName: "Riley Hart",
    email: "newtown@harbourkitchen.com",
    mobile: "+61 400 555 202",
    hasManager: true,
    isDefault: false,
    groupId: "cafe",
    territoryId: "cbd",
    clusterId: "inner",
    activatedAt: daysAgoIso(180),
  },
  {
    id: "westmead-cafe",
    parentId: "hq",
    siteType: "branch",
    name: "Westmead Cafe",
    address: "18 Darcy Road, Westmead NSW",
    postCode: "2145",
    managerName: "Unassigned",
    email: "-",
    mobile: "-",
    hasManager: false,
    isDefault: false,
    groupId: "cafe",
    territoryId: "west",
    clusterId: "parra",
    activatedAt: null,
  },
  {
    id: "liverpool-cafe",
    parentId: "hq",
    siteType: "branch",
    name: "Liverpool Cafe",
    address: "22 Macquarie Street, Liverpool NSW",
    postCode: "2170",
    managerName: "Chris Adeyemi",
    email: "liverpool@harbourkitchen.com",
    mobile: "+61 400 555 203",
    hasManager: true,
    isDefault: false,
    groupId: "cafe",
    territoryId: "west",
    clusterId: "liverpool",
    activatedAt: daysAgoIso(150),
  },
  {
    id: "manly-cafe",
    parentId: "hq",
    siteType: "branch",
    name: "Manly Cafe",
    address: "9 The Corso, Manly NSW",
    postCode: "2095",
    managerName: "Unassigned",
    email: "-",
    mobile: "-",
    hasManager: false,
    isDefault: false,
    groupId: "cafe",
    territoryId: "north",
    clusterId: "northsyd",
    activatedAt: null,
  },
  {
    id: "catering-hq",
    parentId: "hq",
    siteType: "branch",
    name: "Catering Hub",
    address: "40 Hickson Road, Sydney NSW",
    postCode: "2000",
    managerName: "Noah Blake",
    email: "catering@harbourkitchen.com",
    mobile: "+61 400 555 301",
    hasManager: true,
    isDefault: false,
    groupId: "catering",
    territoryId: "cbd",
    clusterId: "quay",
    activatedAt: daysAgoIso(240),
  },
  {
    id: "catering-west",
    parentId: "hq",
    siteType: "branch",
    name: "West Catering",
    address: "11 Fine Drive, Eastern Creek NSW",
    postCode: "2766",
    managerName: "Amelia Ng",
    email: "westcatering@harbourkitchen.com",
    mobile: "+61 400 555 302",
    hasManager: true,
    isDefault: false,
    groupId: "catering",
    territoryId: "west",
    clusterId: "liverpool",
    activatedAt: daysAgoIso(110),
  },
  {
    id: "events-opera",
    parentId: "hq",
    siteType: "branch",
    name: "Events at Circular Quay",
    address: "Bennelong Point, Sydney NSW",
    postCode: "2000",
    managerName: "Grace Patel",
    email: "events@harbourkitchen.com",
    mobile: "+61 400 555 401",
    hasManager: true,
    isDefault: false,
    groupId: "events",
    territoryId: "cbd",
    clusterId: "quay",
    activatedAt: daysAgoIso(95),
  },
  {
    id: "events-north",
    parentId: "hq",
    siteType: "branch",
    name: "North Shore Events",
    address: "1 Olympic Drive, Sydney Olympic Park NSW",
    postCode: "2127",
    managerName: "No manager assigned",
    email: "-",
    mobile: "-",
    hasManager: false,
    isDefault: false,
    groupId: "events",
    territoryId: "north",
    clusterId: "northsyd",
    activatedAt: daysAgoIso(40),
  },
  {
    id: "rozelle-kitchen",
    parentId: "hq",
    siteType: "branch",
    name: "Rozelle Kitchen",
    address: "44 Darling Street, Rozelle NSW",
    postCode: "2039",
    managerName: "Hannah Cole",
    email: "rozelle@harbourkitchen.com",
    mobile: "+61 400 555 105",
    hasManager: true,
    isDefault: false,
    groupId: "kitchen",
    territoryId: "east",
    clusterId: null,
    activatedAt: daysAgoIso(55),
  },
];

const RECIPIENTS = [
  { id: "oz", name: "OzHarvest Sydney" },
  { id: "foodbank", name: "Foodbank NSW" },
  { id: "farm", name: "Western Sydney Farm Rescue" },
  { id: "kitchen", name: "Inner West Community Kitchen" },
  { id: "feed", name: "Livestock Feed Co-op" },
  { id: "bio", name: "Sydney Bioenergy" },
  { id: "circular", name: "Circular Food Lab" },
];

const PATHWAYS: { pathway: RecoveryPathway; weight: number; recipients: string[] }[] = [
  { pathway: "people", weight: 68, recipients: ["oz", "foodbank", "kitchen"] },
  { pathway: "livestock", weight: 14, recipients: ["farm", "feed"] },
  { pathway: "circular", weight: 12, recipients: ["circular"] },
  { pathway: "bioenergy", weight: 6, recipients: ["bio"] },
];

function snapshotFor(site: Pick<OrganizationSite, "id" | "name" | "groupId" | "territoryId" | "clusterId">, override?: Partial<OrganizationSnapshot>): OrganizationSnapshot {
  return {
    groupId: site.groupId ?? "",
    groupName: groupName(site.groupId),
    territoryId: site.territoryId ?? "",
    territoryName: territoryName(site.territoryId),
    clusterId: site.clusterId ?? "",
    clusterName: clusterName(site.clusterId),
    siteId: site.id,
    siteName: site.name,
    ...override,
  };
}

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickPathway(rand: () => number) {
  const roll = rand() * 100;
  let cursor = 0;
  for (const item of PATHWAYS) {
    cursor += item.weight;
    if (roll <= cursor) return item;
  }
  return PATHWAYS[0];
}

const ACTIVE_SITES = new Set([
  "hq",
  "2",
  "3",
  "bondi-kitchen",
  "paddington-kitchen",
  "north-kitchen",
  "parra-kitchen",
  "quay-cafe",
  "catering-hq",
  "events-opera",
]);

const STALE_SITES = new Set(["newtown-cafe", "liverpool-cafe", "events-north"]);
const LISTING_GAP_SITES = new Set(["catering-west"]);

function buildTransactions(sites: SiteSeed[]): RecoveryTransaction[] {
  const byId = new Map(sites.map((site) => [site.id, site]));
  const rand = mulberry32(20260822);
  const rows: RecoveryTransaction[] = [];
  let n = 0;

  const push = (
    site: SiteSeed,
    daysBack: number,
    kg: number,
    snapshot?: Partial<OrganizationSnapshot>,
  ) => {
    const path = pickPathway(rand);
    const recipientId = path.recipients[Math.floor(rand() * path.recipients.length)] ?? path.recipients[0];
    const recipient = RECIPIENTS.find((item) => item.id === recipientId) ?? RECIPIENTS[0];
    rows.push({
      id: `tx-${++n}`,
      occurredAt: daysAgoIso(daysBack),
      kg: Math.round(kg * 10) / 10,
      pathway: path.pathway,
      recipientId: recipient.id,
      recipientName: recipient.name,
      snapshot: snapshotFor(site, snapshot),
    });
  };

  for (const site of sites) {
    if (!site.activatedAt) continue;

    if (ACTIVE_SITES.has(site.id)) {
      for (let day = 2; day <= 88; day += 3 + Math.floor(rand() * 3)) {
        push(site, day, 18 + rand() * 55);
      }
    }

    if (STALE_SITES.has(site.id)) {
      push(site, 38 + Math.floor(rand() * 20), 12 + rand() * 20);
      push(site, 52 + Math.floor(rand() * 15), 10 + rand() * 16);
    }

    if (LISTING_GAP_SITES.has(site.id)) {
      push(site, 12, 22);
      push(site, 41, 18);
    }
  }

  const hq = byId.get("hq");
  if (hq) {
    push(hq, 70, 24, {
      groupId: "kitchen",
      groupName: "Harbour Bistro",
    });
  }

  return rows.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
}

function withActivityDates(sites: SiteSeed[], transactions: RecoveryTransaction[]): OrganizationSite[] {
  return sites.map((site) => {
    const siteTxns = transactions.filter((row) => row.snapshot.siteId === site.id);
    const latest = siteTxns[0]?.occurredAt ?? null;
    const identity = {
      siteCode: SITE_CODES[site.id] ?? site.id.toUpperCase().slice(0, 8),
      status: DEACTIVATED_SITES.has(site.id) ? "deactivated" as const : "active" as const,
    };

    if (!site.activatedAt) {
      return {
        ...site,
        ...identity,
        createdAt: site.createdAt ?? daysAgoIso(21),
        lastActivityAt: null,
        lastListingAt: null,
      };
    }

    if (LISTING_GAP_SITES.has(site.id)) {
      return {
        ...site,
        ...identity,
        lastActivityAt: daysAgoIso(12),
        lastListingAt: daysAgoIso(41),
      };
    }

    if (STALE_SITES.has(site.id)) {
      return {
        ...site,
        ...identity,
        lastActivityAt: latest,
        lastListingAt: latest,
      };
    }

    return {
      ...site,
      ...identity,
      lastActivityAt: latest,
      lastListingAt: latest,
    };
  });
}

const baseSites = seeds.map((site) => ({
  ...site,
  lastActivityAt: site.lastActivityAt ?? null,
  lastListingAt: site.lastListingAt ?? null,
}));

const SITE_CODES: Record<string, string> = {
  hq: "HK-HQ",
  "2": "SH-001",
  "3": "PC-001",
  "bondi-kitchen": "BK-001",
  "paddington-kitchen": "PK-001",
  "north-kitchen": "NSK-001",
  "parra-kitchen": "PKT-001",
  "quay-cafe": "QC-001",
  "newtown-cafe": "NC-001",
  "westmead-cafe": "WC-001",
  "liverpool-cafe": "LC-001",
  "manly-cafe": "MC-001",
  "catering-hq": "CH-001",
  "catering-west": "WCT-001",
  "events-opera": "EQ-001",
  "events-north": "NSE-001",
  "rozelle-kitchen": "RK-001",
};

const DEACTIVATED_SITES = new Set(["events-north"]);

export const recoveryTransactions: RecoveryTransaction[] = buildTransactions(baseSites);
export const demoNetworkSites: OrganizationSite[] = withActivityDates(seeds, recoveryTransactions);

export function lookupOrgNames() {
  return { groupName, territoryName, clusterName };
}

export function siteSnapshot(site: OrganizationSite): OrganizationSnapshot {
  return snapshotFor(site);
}

export { toApiDate, DEMO_TODAY };
