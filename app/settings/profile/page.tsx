"use client";

import { useRef, useState } from "react";
import { ImagePlus, MapPin } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { FormField, FormGrid } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PortalPanel } from "@/components/ui/Portal";
import { demoOrganization } from "@/lib/demo";
import { cn } from "@/lib/utils";

const creamInput =
  "h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-4 font-saveful text-sm text-[#1a1a1a] outline-none transition placeholder:text-[#6B6B6B]/50 focus:border-[#A68FD9] focus:bg-white";

export default function OrganisationProfilePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [address, setAddress] = useState(demoOrganization.address);
  const [registration, setRegistration] = useState(demoOrganization.registration);
  const [branding, setBranding] = useState(demoOrganization.branding);
  const [logo, setLogo] = useState<string | null>(null);

  return (
    <AppPage
      eyebrow="Enterprise Settings"
      title="Organisation Profile"
      description="Legal name, address, and branding used across every site."
    >
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <PortalPanel title="Business details">
          <div className="space-y-5">
            <FormField label="Organisation name">
              <Input value={demoOrganization.name} disabled />
            </FormField>
            <FormField
              label="Registered address"
              hint="Used for pickups and the public listing location."
            >
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className={cn(creamInput, "pl-10")}
                />
              </div>
            </FormField>
            <FormGrid>
              <FormField label="Registration no.">
                <input
                  value={registration}
                  onChange={(event) => setRegistration(event.target.value)}
                  className={creamInput}
                />
              </FormField>
              <FormField label="Venue type">
                <input value={demoOrganization.venueType} disabled className={creamInput} />
              </FormField>
            </FormGrid>
            <Button>Save profile</Button>
          </div>
        </PortalPanel>

        <PortalPanel title="Branding" subtitle="Shown on listings and reports">
          <FormField label="Brand name">
            <input
              value={branding}
              onChange={(event) => setBranding(event.target.value)}
              className={creamInput}
            />
          </FormField>
          <div className="mt-5">
            <p className="font-saveful-semibold text-sm text-gray-900">Logo</p>
            <p className="mt-1 font-saveful text-xs text-gray-500">
              Displays as a circle next to the organisation name.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                if (logo) URL.revokeObjectURL(logo);
                setLogo(URL.createObjectURL(file));
                event.target.value = "";
              }}
            />
            {logo ? (
              <div className="mt-3 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logo} alt="" className="h-16 w-16 rounded-full object-cover" />
                <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                  Replace
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-[#F5F1E8] px-4 py-8 font-saveful-semibold text-sm text-gray-600"
              >
                <ImagePlus className="h-4 w-4" />
                Upload logo
              </button>
            )}
          </div>
        </PortalPanel>
      </div>
    </AppPage>
  );
}
