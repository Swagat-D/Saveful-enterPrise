"use client";

import { PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { activityForSite } from "@/lib/siteWorkspace";
import { cn } from "@/lib/utils";

const tone = {
  Collection: "green",
  Users: "blue",
  Alert: "amber",
} as const;

export function ActivityFeed({
  siteId,
  siteName,
  compact,
}: {
  siteId?: string;
  siteName?: string;
  compact?: boolean;
}) {
  const items = activityForSite(siteId);

  const list = items.length ? (
    <div className={cn(compact ? "divide-y divide-gray-100" : "space-y-3")}>
      {items.map((item) => (
        <article
          key={item.id}
          className={compact ? "py-3 first:pt-0 last:pb-0" : "rounded-2xl border border-gray-100 bg-[#FCFCFA] p-4"}
        >
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={tone[item.type as keyof typeof tone] ?? "slate"}>{item.type}</StatusBadge>
            <span className="font-saveful text-xs text-gray-500">{item.time}</span>
            {siteId ? null : <span className="font-saveful text-xs text-gray-400">· {item.site}</span>}
          </div>
          <h2 className={cn("font-saveful-semibold text-gray-900", compact ? "mt-1 text-sm" : "mt-2 text-base font-saveful-bold")}>
            {item.title}
          </h2>
          <p className={cn("font-saveful text-gray-600", compact ? "mt-0.5 text-sm" : "mt-1 text-sm")}>{item.body}</p>
        </article>
      ))}
    </div>
  ) : (
    <p className="font-saveful text-sm text-gray-500">No activity recorded for this site yet.</p>
  );

  if (compact) return list;

  return (
    <PortalPanel
      title={siteName ? `${siteName} activity` : "Recent activity"}
      subtitle={
        siteName
          ? "Claims, pickups, invites, and alerts for this site only."
          : "Claims, pickups, invites, and site alerts across the organisation."
      }
    >
      {list}
    </PortalPanel>
  );
}
