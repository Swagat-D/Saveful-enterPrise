"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartColumn } from "lucide-react";
import { PortalPanel } from "@/components/ui/Portal";
import { CHART_COLORS, CHART_TOOLTIP, demoGrowth } from "@/lib/demo";

const formatShortDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en", { month: "short", day: "numeric" });
};

export function GrowthTrendsPanel() {
  return (
    <PortalPanel
      title="Growth trends"
      subtitle="New listings, claims & collections · last 7 days"
      className="xl:col-span-2"
    >
      <div className="h-[240px] sm:h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={demoGrowth} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="listingsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.green} stopOpacity={0.28} />
                <stop offset="100%" stopColor={CHART_COLORS.green} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="collectionsFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CHART_COLORS.teal} stopOpacity={0.22} />
                <stop offset="100%" stopColor={CHART_COLORS.teal} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#EEECE6" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={formatShortDate}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94A3B8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={CHART_TOOLTIP}
              labelFormatter={(value) => new Date(String(value)).toLocaleDateString()}
            />
            <Area
              type="monotone"
              dataKey="listings"
              name="Listings"
              stroke={CHART_COLORS.green}
              fill="url(#listingsFill)"
              strokeWidth={2.5}
            />
            <Area
              type="monotone"
              dataKey="collections"
              name="Collections"
              stroke={CHART_COLORS.teal}
              fill="url(#collectionsFill)"
              strokeWidth={2.5}
            />
            <Line
              type="monotone"
              dataKey="claims"
              name="Claims"
              stroke={CHART_COLORS.purple}
              strokeWidth={2}
              dot={{ r: 3, fill: CHART_COLORS.purple }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex flex-wrap gap-4">
        {[
          { label: "Listings", color: CHART_COLORS.green },
          { label: "Collections", color: CHART_COLORS.teal },
          { label: "Claims", color: CHART_COLORS.purple },
        ].map((item) => (
          <div key={item.label} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="font-saveful text-xs text-gray-600">{item.label}</span>
          </div>
        ))}
      </div>
    </PortalPanel>
  );
}

export function WeeklyPulsePanel() {
  const listings7d = demoGrowth.reduce((sum, row) => sum + row.listings, 0);
  const claims7d = demoGrowth.reduce((sum, row) => sum + row.claims, 0);
  const collections7d = demoGrowth.reduce((sum, row) => sum + row.collections, 0);

  return (
    <PortalPanel
      title="Weekly pulse"
      subtitle="New activity · last 7 days"
      action={
        <span className="inline-flex items-center gap-1.5 rounded-full bg-saveful-green/10 px-2.5 py-1 text-[11px] font-saveful-semibold text-saveful-green">
          <ChartColumn className="h-3 w-3" />
          Live
        </span>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "New listings", value: listings7d, accent: "text-saveful-green" },
            { label: "New claims", value: claims7d, accent: "text-violet-700" },
            { label: "Collections", value: collections7d, accent: "text-teal-700" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-[#F7F6F2] px-2 py-2.5 text-center sm:px-2.5">
              <p className="font-saveful text-[10px] uppercase tracking-wider text-gray-400">
                {item.label}
              </p>
              <p className={`mt-1 font-saveful-bold text-xl tabular-nums ${item.accent}`}>
                {item.value}
              </p>
            </div>
          ))}
        </div>

        <div className="h-[120px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={demoGrowth} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#EEECE6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={formatShortDate}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={CHART_TOOLTIP}
                labelFormatter={(value) => new Date(String(value)).toLocaleDateString()}
              />
              <Bar dataKey="listings" stackId="week" fill={CHART_COLORS.green} name="Listings" />
              <Bar dataKey="collections" stackId="week" fill={CHART_COLORS.teal} name="Collections" />
              <Bar
                dataKey="claims"
                stackId="week"
                fill={CHART_COLORS.purple}
                name="Claims"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Active sites", value: "3", hint: "HQ + 2 branches" },
            { label: "Managed", value: "2", hint: "66% of sites" },
            { label: "Food saved", value: "38 kg", hint: "This week" },
            { label: "Meals", value: "76", hint: "Estimated" },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-gray-100 bg-white px-3 py-2.5">
              <p className="font-saveful text-[10px] uppercase tracking-wider text-gray-400">
                {item.label}
              </p>
              <p className="mt-1 font-saveful-bold text-lg tabular-nums text-gray-900">
                {item.value}
              </p>
              <p className="font-saveful text-[11px] text-gray-500">{item.hint}</p>
            </div>
          ))}
        </div>
      </div>
    </PortalPanel>
  );
}
