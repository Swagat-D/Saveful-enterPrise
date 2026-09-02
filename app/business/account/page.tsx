"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CreditCard,
  FileText,
  ImageIcon,
  LifeBuoy,
  LogOut,
  Shield,
  Trash2,
  UserRound,
  Users,
} from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { PortalPageHeader, PortalPageShell } from "@/components/ui/Portal";
import { businessRoleLabel } from "@/config/businessSidebar";
import { cn } from "@/lib/utils";
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

  const initials = user.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <PortalPageShell>
      <PortalPageHeader eyebrow="Account" title="Your account" description="Manage your profile, business details, and support." />

      <div className="mx-auto w-full max-w-3xl space-y-6">
        <section className="flex items-center gap-4 rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
          {user.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.logoUrl} alt="" className="h-16 w-16 shrink-0 rounded-2xl object-cover ring-1 ring-black/5" />
          ) : (
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-saveful-green/10 font-saveful-bold text-lg text-saveful-green">
              {initials || "S"}
            </div>
          )}
          <div className="min-w-0">
            <h2 className="font-saveful-bold text-xl text-gray-900">{user.name}</h2>
            <p className="mt-0.5 truncate font-saveful text-sm text-gray-500">
              {user.organization}
              {since ? ` · since ${since}` : ""}
            </p>
            <span className="mt-2 inline-flex rounded-full bg-[#F0F8F3] px-2.5 py-0.5 font-saveful-semibold text-[11px] text-saveful-green">
              {businessRoleLabel(user)}
            </span>
          </div>
        </section>

        {error ? (
          <p className="rounded-xl bg-amber-50 px-4 py-3 font-saveful text-sm text-amber-800">{error}</p>
        ) : null}
        {notice ? (
          <p className="rounded-xl bg-saveful-green/10 px-4 py-3 font-saveful text-sm text-saveful-green">{notice}</p>
        ) : null}

        <section className="space-y-2">
          <p className="px-1 font-saveful text-[11px] uppercase tracking-[0.16em] text-gray-400">Your details</p>
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <Accordion
              title="Personal Details"
              hint="Name, email, mobile and password"
              icon={<UserRound className="h-4 w-4" />}
              open={open === "personal"}
              onToggle={() => toggle("personal")}
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="First Name" value={user.firstName} readOnly />
                <Field label="Last Name" value={user.lastName} readOnly />
              </div>
              <Field label="Email" value={user.email} readOnly />
              <label className="block">
                <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Mobile number (optional)</span>
                <input value={mobile} onChange={(event) => setMobile(event.target.value)} className={fieldClass} />
              </label>
              <div className="flex flex-wrap items-center justify-between gap-3">
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
                    className="mt-1 inline-flex items-center gap-1 font-saveful-semibold text-sm text-saveful-green hover:underline"
                  >
                    Change password <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <SaveButton busy={saving === "personal"} onClick={() => void savePersonal()} />
              </div>
            </Accordion>

            <Accordion
              title="Notifications"
              hint="Collection and claim alerts"
              icon={<Bell className="h-4 w-4" />}
              open={open === "notifications"}
              onToggle={() => toggle("notifications")}
            >
              <p className="font-saveful text-sm leading-relaxed text-gray-500">
                Collection and claim alerts are sent in the Saveful app. Download the app for a better experience and to
                manage notification permissions.
              </p>
            </Accordion>

            <Accordion
              title={isFarm ? "Farm Details" : "Business Details"}
              hint="Address, venue and registration"
              icon={<Building2 className="h-4 w-4" />}
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

            <Accordion
              title="Branding & logo"
              hint="How your business appears"
              icon={<ImageIcon className="h-4 w-4" />}
              open={open === "extra"}
              onToggle={() => toggle("extra")}
              last
            >
              <label className="block">
                <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Branding</span>
                <input value={branding} onChange={(event) => setBranding(event.target.value)} className={fieldClass} />
              </label>
              <BusinessLogoField file={logo} existingUrl={user.logoUrl} onFile={setLogo} />
              <SaveButton busy={saving === "extra"} onClick={() => void saveExtra()} />
            </Accordion>
          </div>
        </section>

        <section className="space-y-2">
          <p className="px-1 font-saveful text-[11px] uppercase tracking-[0.16em] text-gray-400">Workspace</p>
          <div className="overflow-hidden rounded-2xl border border-black/[0.04] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <RowLink href="/business/access" label="Manage Access" hint="Invite and remove site access" icon={<Users className="h-4 w-4" />} />
            {!isBusinessLocationUser(user) ? (
              <RowLink href="/business/plans" label="Plans" hint="Billing and subscription" icon={<CreditCard className="h-4 w-4" />} />
            ) : null}
            <RowLink href="https://www.saveful.com/privacy-policy" label="Privacy Policy" hint="How we use your data" icon={<Shield className="h-4 w-4" />} external />
            <RowLink href="https://www.saveful.com/saveful-for-business-terms-conditions" label="Terms of Service" hint="Your agreement with Saveful" icon={<FileText className="h-4 w-4" />} external />
            <RowLink href="https://www.saveful.com/faq#saveful-for-business-faq" label="FAQ" hint="Common questions" icon={<CircleHelp className="h-4 w-4" />} external last />
          </div>
        </section>

        <section className="rounded-2xl border border-saveful-green/15 bg-[#F3F8F5] p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-saveful-green shadow-sm ring-1 ring-saveful-green/10">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-saveful-bold text-base text-gray-900">Need a hand?</h3>
              <p className="mt-1 font-saveful text-sm leading-relaxed text-gray-600">
                Questions about listings, sites or billing — please review the{" "}
                <a
                  href="https://www.saveful.com/faq#saveful-for-business-faq"
                  target="_blank"
                  rel="noreferrer"
                  className="font-saveful-semibold text-saveful-green hover:underline"
                >
                  FAQs
                </a>
                . If you still have any further questions we can help.
              </p>
              <a
                href="https://www.saveful.com/contact"
                target="_blank"
                rel="noreferrer"
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-saveful-green px-4 font-saveful-semibold text-sm text-white transition hover:bg-[#264f42]"
              >
                Contact support
              </a>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pb-2">
          <button
            type="button"
            onClick={() => {
              logoutBusiness();
              router.replace("/");
            }}
            className="inline-flex items-center gap-1.5 font-saveful-semibold text-sm text-saveful-green hover:underline"
          >
            <LogOut className="h-3.5 w-3.5" />
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
            className="inline-flex items-center gap-1.5 font-saveful text-sm text-gray-400 hover:text-red-600"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete my account
          </button>
        </div>
      </div>
    </PortalPageShell>
  );
}

function Accordion({
  title,
  hint,
  icon,
  open,
  onToggle,
  children,
  last,
}: {
  title: string;
  hint?: string;
  icon: ReactNode;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? "" : "border-b border-[#F0EBE3]"}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-[#F7F6F2]/80 sm:px-5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F0F8F3] text-saveful-green">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-saveful-semibold text-sm text-gray-900">{title}</span>
          {hint ? <span className="mt-0.5 block font-saveful text-xs text-gray-400">{hint}</span> : null}
        </span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-gray-400 transition", open && "rotate-180 text-saveful-green")} />
      </button>
      {open ? <div className="space-y-3.5 px-4 pb-5 pt-1 sm:px-5">{children}</div> : null}
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
      className="h-10 rounded-xl bg-saveful-green px-5 font-saveful-semibold text-sm text-white disabled:opacity-50 sm:ml-auto"
    >
      {busy ? "Saving…" : "Save"}
    </button>
  );
}

function RowLink({
  href,
  label,
  hint,
  icon,
  external,
  last,
}: {
  href: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  external?: boolean;
  last?: boolean;
}) {
  const className = cn(
    "flex items-center gap-3 px-4 py-3.5 transition hover:bg-[#F7F6F2]/80 sm:px-5",
    !last && "border-b border-[#F0EBE3]",
  );
  const inner = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F7F6F2] text-saveful-green">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-saveful-semibold text-sm text-gray-900">{label}</span>
        {hint ? <span className="mt-0.5 block font-saveful text-xs text-gray-400">{hint}</span> : null}
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
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
