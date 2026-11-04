"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CHART_TOOLTIP } from "@/lib/demo";
import { formatKg } from "@/lib/impact";
import type { RecoveryPathway } from "@/types/enterprise";
import { cn } from "@/lib/utils";

export type PathwayDonutRow = { pathway: RecoveryPathway; label: string; kg: number; percent: number; color: string };

export function PathwayDonut({
  rows,
  totalKg,
  selected,
  onSelect,
  emptyText = "No recovered volume for these filters.",
}: {
  rows: PathwayDonutRow[];
  totalKg: number;
  selected: "all" | RecoveryPathway;
  onSelect: (pathway: "all" | RecoveryPathway) => void;
  emptyText?: string;
}) {
  const data = rows.filter((item) => item.kg > 0);
  const selectedLabel = rows.find((item) => item.pathway === selected)?.label;
  return (
    <div className="px-3.5 pb-3 pt-2">
      {selected !== "all" ? (
        <div className="mb-1 flex items-center justify-between gap-2 rounded-lg bg-[#F7F6F2] px-2.5 py-1.5">
          <p className="min-w-0 truncate font-saveful text-xs text-gray-600">
            Showing <span className="font-saveful-semibold text-gray-900">{selectedLabel}</span> only
          </p>
          <button
            type="button"
            onClick={() => onSelect("all")}
            className="shrink-0 font-saveful-semibold text-xs text-saveful-green hover:underline"
          >
            Show all
          </button>
        </div>
      ) : null}
      {data.length ? (
        <>
          <div className="relative mx-auto h-40 w-40">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  dataKey="kg"
                  nameKey="label"
                  innerRadius={46}
                  outerRadius={64}
                  paddingAngle={data.length > 1 ? 2 : 0}
                  onClick={(_, index) => data[index] && onSelect(selected === data[index].pathway ? "all" : data[index].pathway)}
                  style={{ cursor: "pointer" }}
                >
                  {data.map((item) => (
                    <Cell
                      key={item.pathway}
                      fill={item.color}
                      opacity={selected === "all" || selected === item.pathway ? 1 : 0.35}
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={CHART_TOOLTIP} formatter={(value, _name, item) => [formatKg(Number(value)), item.payload.label]} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-saveful-bold text-sm tabular-nums text-gray-900">{formatKg(totalKg)}</p>
              <p className="font-saveful text-[10px] text-gray-400">recovered</p>
            </div>
          </div>
          <ul className="mt-1 space-y-1">
            <li>
              <button
                type="button"
                onClick={() => onSelect("all")}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-[#FAF7F0]",
                  selected === "all" && "bg-saveful-green/[0.06]",
                )}
              >
                <span className="h-2 w-2 shrink-0 rounded-full border border-gray-400" />
                <span className="min-w-0 truncate font-saveful text-sm text-gray-700">All pathways</span>
              </button>
            </li>
            {rows.map((item) => (
              <li key={item.pathway}>
                <button
                  type="button"
                  onClick={() => onSelect(selected === item.pathway ? "all" : item.pathway)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 rounded-lg px-1 py-1 text-left hover:bg-[#FAF7F0]",
                    selected === item.pathway && "bg-saveful-green/[0.06]",
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: item.color }} />
                    <span className="min-w-0 truncate font-saveful text-sm text-gray-700">{item.label}</span>
                  </span>
                  <span className="shrink-0 font-saveful text-xs tabular-nums text-gray-500">
                    {formatKg(item.kg)} · {item.percent}%
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="px-1 py-8 text-center font-saveful text-sm text-gray-500">{emptyText}</p>
      )}
    </div>
  );
}
