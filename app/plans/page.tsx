"use client";

import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { PortalPanel, StatusBadge } from "@/components/ui/Portal";

export default function PlansPage() {
  return (
    <AppPage
      eyebrow="Billing"
      title="Enterprise plan"
      description="Multi-site restaurant groups use Enterprise. Billing and the consult form will connect to the business API next."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <PortalPanel title="Current plan" subtitle="Organisation entitlement">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-saveful-bold text-2xl text-gray-900">Enterprise</h2>
            <StatusBadge tone="green">Active</StatusBadge>
          </div>
          <p className="mt-3 font-saveful text-sm text-gray-600">
            Unlimited sites, organisation listings, impact reports, and manager access across every kitchen.
          </p>
          <div className="mt-5">
            <Button type="button">Request a consult</Button>
          </div>
        </PortalPanel>
        <PortalPanel title="Included" subtitle="Same as restaurant multi-site enterprise">
          <ul className="space-y-2 font-saveful text-sm text-gray-700">
            <li>HQ plus unlimited branches</li>
            <li>Site manager access</li>
            <li>Organisation surplus listings</li>
            <li>Impact reports and site analytics</li>
          </ul>
        </PortalPanel>
      </div>
    </AppPage>
  );
}
