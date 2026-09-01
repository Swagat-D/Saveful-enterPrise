"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ChevronRight, Minus, Plus } from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { PortalPageHeader, PortalPageShell, PortalPanel } from "@/components/ui/Portal";
import { AddressPicker, type PickedLocation } from "@/components/sites/AddressPicker";
import { ApiError, requestPasswordReset } from "@/lib/api";
import {
  updateBusinessOrganisation,
  updateBusinessOrganisationCoordinates,
  updateBusinessProfile,
  updateBusinessSite,
} from "@/lib/businessApi";
import { BusinessLogoField } from "@/components/business/BusinessLogoField";
import { logoutBusiness, refreshBusinessSession, useBusinessSession } from "@/lib/businessAuth";
import { isBusinessLocationUser } from "@/lib/businessHqSite";
import { appendSignupLogo } from "@/lib/businessLogo";
import {
  FARM_VENUES,
  RESTAURANT_VENUES,
  type BusinessRole,
} from "@/lib/businessTypes";

const fieldClass =
  "h-11 w-full rounded-xl border border-[#E4E0D6] bg-[#F7F6F2] px-3.5 font-saveful text-sm text-gray-900 outline-none transition focus:border-saveful-green/40 focus:bg-white";

export default function BusinessAccountPage() {
  return (
    <BusinessGate>
      <AccountInner />
    </BusinessGate>
  );
}

function AccountInner() {
  const user = useBusinessSession();
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [mobile, setMobile] = useState("");
  const [address, setAddress] = useState("");
  const [registration, setRegistration] = useState("");
  const [venueType, setVenueType] = useState("");
  const [branding, setBranding] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [place, setPlace] = useState<PickedLocation>({ address: "", postcode: "", lat: NaN, lon: NaN });
  const [saving, setSaving] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) return;
    setMobile(user.phoneNumber ?? "");
    setAddress(user.address ?? "");
    setRegistration(user.registrationNumber ?? "");
    setVenueType(user.venueType ?? "");
    setBranding(user.brandName ?? "");
    setPlace({
      address: user.address ?? "",
      postcode: "",
      lat: Number.NaN,
      lon: Number.NaN,
    });
  }, [user]);

  if (!user) return null;

  const role: BusinessRole = user.role;
  const isFarm = role === "farm_business";
  const isMulti = role === "restaurant_multi";
  const isRestaurant = role === "restaurant_single" || isMulti;
  const usesSiteAddress = role === "restaurant_single" || isFarm;
  const venues = isFarm ? FARM_VENUES : RESTAURANT_VENUES;
  const since = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
    : "";
  const toggle = (key: string) => setOpen((current) => (current === key ? null : key));

  const run = async (key: string, work: () => Promise<void>) => {
    setSaving(key);
    setError("");
    setNotice("");
    try {
      await work();
      await refreshBusinessSession();
      setNotice("Details updated");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not update.");
    } finally {
      setSaving("");
    }
  };

  const savePersonal = () =>
    run("personal", async () => {
      await updateBusinessProfile(mobile.trim());
    });

  const saveBusiness = () =>
    run("business", async () => {
      const nextAddress = (place.address || address).trim();
      const hasCoords = Number.isFinite(place.lat) && Number.isFinite(place.lon);
      if (nextAddress && !hasCoords) {
        throw new Error("Please use Location Recommendation so latitude and longitude update with the address.");
      }
      if (usesSiteAddress && user.siteId && nextAddress) {
        await updateBusinessSite(user.siteId, {
          address: nextAddress,
          ...(hasCoords ? { latitude: place.lat, longitude: place.lon } : {}),
        });
      }
      if (hasCoords) {
        await updateBusinessOrganisationCoordinates(user.organisationId, {
          latitude: place.lat,
          longitude: place.lon,
        });
      }
      const form = new FormData();
      let hasOrg = false;
      if (!isFarm && registration.trim()) {
        form.append("registrationNumber", registration.trim());
        hasOrg = true;
      }
      if (isRestaurant && venueType.trim()) {
        form.append("venueType", venueType.trim());
        hasOrg = true;
      }
      if (isFarm && venueType.trim()) {
        form.append("venueType", venueType.trim());
        hasOrg = true;
      }
      if (isMulti && nextAddress) {
        form.append("businessAddress", nextAddress);
        hasOrg = true;
      }
      if (hasOrg) await updateBusinessOrganisation(user.organisationId, form);
    });

  const saveExtra = () =>
    run("extra", async () => {
      const form = new FormData();
      form.append("brandName", branding.trim());
      if (logo) appendSignupLogo(form, logo);
      await updateBusinessOrganisation(user.organisationId, form);
    });

  return (
    <PortalPageShell>
      <PortalPageHeader
        eyebrow="Account"
        title={user.name}
        description={since ? `Saveful for Business since ${since}` : "Saveful for Business"}
      />

      <PortalPanel title="Need a hand?" subtitle="Questions about listings, sites or billing — we can help.">
        <a
          href="https://www.saveful.com/contact"
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-11 items-center rounded-xl border border-black/[0.06] bg-white px-5 font-saveful-semibold text-sm text-gray-800 transition hover:border-saveful-green/30 hover:text-saveful-green"
        >
          Contact support
        </a>
      </PortalPanel>

      <div className="space-y-3">

        {error ? (
          <p className="rounded-2xl bg-amber-50 px-4 py-3 font-saveful text-sm text-amber-800">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-2xl bg-saveful-green/10 px-4 py-3 font-saveful text-sm text-saveful-green">{notice}</p>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white">
          <Accordion title="Personal Details" open={open === "personal"} onToggle={() => toggle("personal")}>
            <Field label="First Name" value={user.firstName} readOnly />
            <Field label="Last Name" value={user.lastName} readOnly />
            <Field label="Email" value={user.email} readOnly />
            <label className="block">
              <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Mobile number (optional)</span>
              <input value={mobile} onChange={(event) => setMobile(event.target.value)} className={fieldClass} />
            </label>
            <div>
              <p className="font-saveful-semibold text-sm text-gray-800">Password</p>
              <button
                type="button"
                onClick={() =>
                  void requestPasswordReset(user.email).then(
                    () => setNotice("We sent a reset code to your email."),
                    (err) => setError(err instanceof Error ? err.message : "Could not start password reset."),
                  )
                }
                className="mt-1 inline-flex items-center gap-1 font-saveful text-sm text-saveful-green"
              >
                Change Password <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <SaveButton busy={saving === "personal"} onClick={() => void savePersonal()} />
          </Accordion>

          <Accordion title="Notifications" open={open === "notifications"} onToggle={() => toggle("notifications")}>
            <p className="font-saveful text-sm leading-relaxed text-gray-500">
              Collection and claim alerts are sent in the Saveful app. Download the app for a better experience and to
              manage notification permissions.
            </p>
          </Accordion>

          <Accordion
            title={isFarm ? "Farm Details" : "Business Details"}
            open={open === "business"}
            onToggle={() => toggle("business")}
          >
            <Field label="Name" value={user.organization} readOnly />
            <div>
              <p className="mb-1.5 font-saveful-semibold text-sm text-gray-800">Address / Location</p>
              <p className="mb-2 font-saveful text-xs text-gray-500">
                Update address with map search so latitude and longitude stay accurate for pickups.
              </p>
              <AddressPicker
                value={place}
                onChange={(next) => {
                  setPlace(next);
                  setAddress(next.address);
                }}
                compact
              />
            </div>
            {!isFarm ? (
              <label className="block">
                <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Registration No.</span>
                <input value={registration} onChange={(event) => setRegistration(event.target.value)} className={fieldClass} />
              </label>
            ) : null}
            <label className="block">
              <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Venue Type</span>
              <select value={venueType} onChange={(event) => setVenueType(event.target.value)} className={fieldClass}>
                <option value="">Select…</option>
                {venues.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <SaveButton busy={saving === "business"} onClick={() => void saveBusiness()} />
          </Accordion>

          <Accordion title="Extra Info (Branding + Logo)" open={open === "extra"} onToggle={() => toggle("extra")} last>
            <label className="block">
              <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Branding</span>
              <input value={branding} onChange={(event) => setBranding(event.target.value)} className={fieldClass} />
            </label>
            <BusinessLogoField
              file={logo}
              existingUrl={user.logoUrl}
              onFile={setLogo}
            />
            <SaveButton busy={saving === "extra"} onClick={() => void saveExtra()} />
          </Accordion>
        </div>

        <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white">
          {isRestaurant && isMulti ? (
            <RowLink href="/business/access" label="Manage Access" />
          ) : null}
          {!isBusinessLocationUser(user) ? <RowLink href="/business/plans" label="Plans" /> : null}
          <RowLink href="https://www.saveful.com/privacy-policy" label="Privacy Policy" external />
          <RowLink href="https://www.saveful.com/saveful-for-business-terms-conditions" label="Terms of Service" external />
          <RowLink href="https://www.saveful.com/faq#saveful-for-business-faq" label="FAQ" external last />
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              logoutBusiness();
              router.replace("/");
            }}
            className="h-12 w-full rounded-2xl border border-black/[0.04] bg-white font-saveful-semibold text-saveful-green"
          >
            Log out
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Are you sure you want to delete your account?")) {
                logoutBusiness();
                router.replace("/");
              }
            }}
            className="h-12 w-full rounded-2xl border border-black/[0.04] bg-white font-saveful-semibold text-saveful-green"
          >
            Delete my account
          </button>
        </div>
      </div>
    </PortalPageShell>
  );
}

function Accordion({
  title,
  open,
  onToggle,
  children,
  last,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "border-b border-[#F0EBE3]"}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between px-5 py-4 text-left">
        <span className="font-saveful-semibold text-sm text-gray-900">{title}</span>
        {open ? <Minus className="h-4 w-4 text-gray-400" /> : <Plus className="h-4 w-4 text-gray-400" />}
      </button>
      {open ? <div className="space-y-3.5 px-5 pb-5">{children}</div> : null}
    </div>
  );
}

function Field({ label, value, readOnly }: { label: string; value: string; readOnly?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">{label}</span>
      <input value={value} readOnly={readOnly} className={`${fieldClass} ${readOnly ? "text-gray-500" : ""}`} />
    </label>
  );
}

function SaveButton({ busy, onClick }: { busy: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      className="h-11 w-full rounded-xl bg-saveful-green font-saveful-semibold text-white disabled:opacity-50"
    >
      {busy ? "Saving…" : "Save"}
    </button>
  );
}

function RowLink({
  href,
  label,
  external,
  last,
}: {
  href: string;
  label: string;
  external?: boolean;
  last?: boolean;
}) {
  const className = `flex items-center justify-between px-5 py-4 font-saveful text-sm text-gray-900 ${last ? "" : "border-b border-[#F0EBE3]"}`;
  const inner = (
    <>
      {label}
      <ChevronRight className="h-4 w-4 text-gray-400" />
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}
