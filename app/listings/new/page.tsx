"use client";

import Link from "next/link";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortalPanel } from "@/components/ui/Portal";
import { demoSites } from "@/lib/demo";

export default function CreateListingPage() {
  return (
    <AppPage
      eyebrow="Listings"
      title="Create listing"
      description="List surplus from a site. Charities and farmers nearby can claim it for pickup."
    >
      <PortalPanel title="Listing details" subtitle="Same fields as restaurant create listing">
        <form className="grid max-w-2xl gap-5">
          <div className="space-y-2">
            <Label htmlFor="site">Site</Label>
            <select
              id="site"
              className="shadow-input h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-4 text-sm text-[#1a1a1a] focus:border-[#A68FD9] focus:bg-white focus:outline-none"
            >
              {demoSites.map((site) => (
                <option key={site.id}>{site.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Food title</Label>
            <Input id="title" placeholder="Evening bread and pastries" />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="qty">Quantity (kg)</Label>
              <Input id="qty" placeholder="12" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="audience">Audience</Label>
              <select
                id="audience"
                className="shadow-input h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-4 text-sm text-[#1a1a1a] focus:border-[#A68FD9] focus:bg-white focus:outline-none"
              >
                <option>People</option>
                <option>Animals</option>
                <option>Both</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="window">Pickup window</Label>
            <Input id="window" placeholder="Today · 8:00 pm – 9:30 pm" />
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button type="button">Publish listing</Button>
            <Link href="/listings">
              <Button type="button" variant="secondary">Cancel</Button>
            </Link>
          </div>
        </form>
      </PortalPanel>
    </AppPage>
  );
}
