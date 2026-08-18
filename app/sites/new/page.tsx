"use client";

import Link from "next/link";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalPanel } from "@/components/ui/Portal";

export default function CreateSitePage() {
  return (
    <AppPage
      eyebrow="Locations"
      title="Add location"
      description="Add a branch so another kitchen can list surplus and manage its own team."
    >
      <PortalPanel title="Location details" subtitle="Map search will fill address and postcode later">
        <form className="grid max-w-xl gap-5">
          <div className="space-y-2">
            <Label htmlFor="name">Location name</Label>
            <Input id="name" placeholder="e.g. Surry Hills Kitchen" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" placeholder="Search restaurant address" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="postcode">Postcode</Label>
            <Input id="postcode" placeholder="Auto-filled from the map" />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button">Save location</Button>
            <Link href="/sites">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </PortalPanel>
    </AppPage>
  );
}
