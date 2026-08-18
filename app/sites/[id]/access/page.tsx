"use client";

import { use } from "react";
import Link from "next/link";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalPanel, StatusBadge } from "@/components/ui/Portal";
import { demoSites } from "@/lib/demo";

export default function ManageAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const site = demoSites.find((item) => item.id === id);

  return (
    <AppPage
      eyebrow="Site access"
      title={site ? site.name : "Manage access"}
      description="Invite a site manager or remove access for this location only."
      actions={
        <Link href="/sites">
          <Button variant="secondary">Back to sites</Button>
        </Link>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <PortalPanel title="Current manager" subtitle="Assigned to this site only">
          <p className="font-saveful-semibold text-gray-900">
            {site?.hasManager ? site.managerName : "No manager assigned"}
          </p>
          <p className="mt-1 font-saveful text-sm text-gray-500">{site?.email}</p>
          <div className="mt-4">
            <StatusBadge tone={site?.hasManager ? "green" : "amber"}>
              {site?.hasManager ? "Managed" : "Needs manager"}
            </StatusBadge>
          </div>
        </PortalPanel>
        <PortalPanel title="Invite manager" subtitle="They only get this location">
          <form className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="manager-name">Manager name</Label>
              <Input id="manager-name" placeholder="Priya Nair" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="manager-email">Email</Label>
              <Input id="manager-email" type="email" placeholder="manager@yourbusiness.com" />
            </div>
            <Button type="button">Send invite</Button>
          </form>
        </PortalPanel>
      </div>
    </AppPage>
  );
}
