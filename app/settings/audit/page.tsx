"use client";

import { AppPage } from "@/components/layout/AppPage";
import { PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { listAudit, useAuditVersion } from "@/lib/audit";

export default function AuditLogPage() {
  useAuditVersion();
  const entries = listAudit();
  return (
    <AppPage
      eyebrow="Enterprise Settings"
      title="Audit Log"
      description="Who changed organisation settings, access, and sites."
    >
      <PortalPanel title="Recent changes" subtitle="Kept for administrators">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4 font-saveful">When</th>
                <th className="pb-3 pr-4 font-saveful">Actor</th>
                <th className="pb-3 pr-4 font-saveful">Action</th>
                <th className="pb-3 font-saveful">Detail</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-gray-50 last:border-0">
                  <td className="whitespace-nowrap py-3 pr-4 font-saveful text-xs text-gray-500">
                    {entry.time}
                  </td>
                  <td className="py-3 pr-4 font-saveful-semibold text-sm text-gray-900">
                    {entry.actor}
                  </td>
                  <td className="py-3 pr-4">
                    <StatusBadge tone="slate">{entry.action}</StatusBadge>
                  </td>
                  <td className="py-3 font-saveful text-sm text-gray-600">{entry.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalPanel>
    </AppPage>
  );
}
