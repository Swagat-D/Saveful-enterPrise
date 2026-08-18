"use client";

import { AppPage } from "@/components/layout/AppPage";
import { PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { useSession } from "@/lib/auth";

export default function AccountPage() {
  const user = useSession();

  const fields = [
    { label: "Name", value: user?.name || "Head admin" },
    { label: "Business", value: user?.organization || "Your business" },
    { label: "Email", value: user?.email || "—" },
    { label: "Role", value: "Restaurant multi-site · Head admin" },
  ];

  return (
    <AppPage
      eyebrow="Profile"
      title="Account"
      description="Organisation details, head-office contact, and notification preferences."
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <PortalPanel title="Organisation" subtitle="Head office profile">
          <dl className="grid gap-4 sm:grid-cols-2">
            {fields.map((field) => (
              <div key={field.label}>
                <dt className="font-saveful text-xs uppercase tracking-wide text-gray-500">
                  {field.label}
                </dt>
                <dd className="mt-1 font-saveful-semibold text-sm text-gray-900">{field.value}</dd>
              </div>
            ))}
          </dl>
        </PortalPanel>
        <PortalPanel title="Access" subtitle="Who can manage billing and sites">
          <StatusBadge tone="green">Head admin</StatusBadge>
          <p className="mt-3 font-saveful text-sm text-gray-600">
            Head admins can add locations, assign managers, and open the enterprise plan.
          </p>
        </PortalPanel>
      </div>
    </AppPage>
  );
}
