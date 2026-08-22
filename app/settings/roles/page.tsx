"use client";

import { Shield } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { demoRoles } from "@/lib/demo";

export default function RolesPermissionsPage() {
  return (
    <AppPage
      eyebrow="Enterprise Settings"
      title="Roles & Permissions"
      description="What each role can see and change across the organisation."
      actions={
        <Button href="/users" variant="secondary" className="w-full sm:w-auto">
          Manage users
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {demoRoles.map((role) => (
          <PortalPanel
            key={role.id}
            title={role.name}
            subtitle={`${role.users} ${role.users === 1 ? "person" : "people"}`}
          >
            <p className="font-saveful text-sm text-gray-600">{role.description}</p>
            <ul className="mt-4 flex flex-wrap gap-2">
              {role.permissions.map((permission) => (
                <StatusBadge key={permission} tone="green">
                  {permission}
                </StatusBadge>
              ))}
            </ul>
          </PortalPanel>
        ))}
      </div>

      <PortalPanel title="Permission matrix" subtitle="Organisation-level defaults">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="border-b border-gray-100 font-saveful text-[11px] uppercase tracking-wide text-gray-500">
                <th className="pb-3 pr-4 font-saveful">Capability</th>
                {demoRoles.map((role) => (
                  <th key={role.id} className="pb-3 pr-4 font-saveful">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="font-saveful text-sm text-gray-700">
              {[
                ["View all sites", true, "Assigned groups", false, false, false],
                ["Manage users", true, "Within scope", "Local", false, false],
                ["Change settings", true, false, false, false, false],
                ["Create listings", true, true, true, false, true],
                ["View reports", true, "Assigned scope", "Assigned site", "Assigned scope", false],
              ].map(([capability, ...flags]) => (
                <tr key={String(capability)} className="border-b border-gray-50 last:border-0">
                  <td className="flex items-center gap-2 py-3 pr-4 font-saveful-semibold">
                    <Shield className="h-3.5 w-3.5 text-saveful-green" />
                    {capability}
                  </td>
                  {flags.map((flag, index) => (
                    <td key={`${capability}-${index}`} className="py-3 pr-4">
                      {flag === true ? (
                        <StatusBadge tone="green">Allowed</StatusBadge>
                      ) : flag === false ? (
                        <StatusBadge tone="slate">No</StatusBadge>
                      ) : (
                        <StatusBadge tone="blue">{String(flag)}</StatusBadge>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PortalPanel>
    </AppPage>
  );
}
