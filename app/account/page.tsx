"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Bell,
  Building2,
  ChevronRight,
  ExternalLink,
  ImagePlus,
  Lock,
  LogOut,
  MapPin,
  Minus,
  Palette,
  Plus,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { logout, useSession } from "@/lib/auth";
import { demoOrganization } from "@/lib/demo";
import { cn } from "@/lib/utils";

const creamInput =
  "h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-4 font-saveful text-sm text-[#1a1a1a] outline-none transition placeholder:text-[#6B6B6B]/50 focus:border-[#A68FD9] focus:bg-white disabled:opacity-70";

const VENUE_TYPES = [
  { label: "Cafe/Restaurant", value: "CAFE_RESTAURANT" },
  { label: "Bakery", value: "BAKERY" },
  { label: "Grocery Store", value: "GROCERY_STORE" },
  { label: "Food Truck", value: "FOOD_TRUCK" },
  { label: "Caterers", value: "CATERING_SERVICE" },
  { label: "Hotel", value: "HOTEL" },
  { label: "Wedding Venue", value: "WEDDING_VENUE" },
  { label: "Cloud Kitchen", value: "CLOUD_KITCHEN" },
  { label: "Other", value: "OTHER" },
];

export default function AccountPage() {
  const router = useRouter();
  const user = useSession();
  const fileRef = useRef<HTMLInputElement>(null);
  const nameParts = (user?.name || "Head Admin").split(" ");
  const firstName = nameParts[0] || "Head";
  const lastName = nameParts.slice(1).join(" ") || "Admin";

  const [openSection, setOpenSection] = useState<string | null>("personal");
  const [mobile, setMobile] = useState("+61 400 111 222");
  const [address, setAddress] = useState(demoOrganization.address);
  const [registration, setRegistration] = useState("ABN 12 345 678 901");
  const [venueType, setVenueType] = useState("CAFE_RESTAURANT");
  const [branding, setBranding] = useState("Harbour Kitchen");
  const [logo, setLogo] = useState<string | null>(null);
  const [notifyClaims, setNotifyClaims] = useState(true);
  const [notifyPickups, setNotifyPickups] = useState(true);
  const [notifyNearby, setNotifyNearby] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState({ current: "", next: "", confirm: "" });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const toggle = (key: string) => setOpenSection((current) => (current === key ? null : key));

  const handleLogo = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (logo) URL.revokeObjectURL(logo);
    setLogo(URL.createObjectURL(file));
  };

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <AppPage
      eyebrow="Profile"
      title={user?.name || "Account"}
      description="Saveful for Business since March 2026"
    >
      <div className="mx-auto w-full max-w-4xl space-y-4">
        <section className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-saveful-green/10 ring-2 ring-white shadow-sm">
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-saveful-bold text-2xl text-saveful-green">
                  {(user?.name || "S").charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="font-saveful-bold text-xl text-gray-900">{user?.name || "Head admin"}</p>
              <p className="font-saveful text-sm text-gray-500">
                {demoOrganization.name} · Restaurant multi-site
              </p>
            </div>
          </div>
          <span className="inline-flex w-fit rounded-full bg-saveful-green/10 px-3 py-1 font-saveful-semibold text-xs text-saveful-green">
            Head admin
          </span>
        </section>

        <section className="rounded-2xl border border-gray-100 bg-white p-5 text-center shadow-sm sm:p-6">
          <h2 className="font-saveful-bold text-base text-gray-900">Need a hand?</h2>
          <div className="mx-auto my-3 h-px w-16 bg-gray-200" />
          <p className="mx-auto max-w-lg font-saveful text-sm leading-relaxed text-gray-600">
            We&apos;re here to help! If you need a hand with anything, or have any questions, feel free to reach out and we&apos;ll help out.
          </p>
          <a
            href="https://www.saveful.com/contact"
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex"
          >
            <Button variant="secondary" className="w-full sm:w-auto">
              Contact support
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </a>
        </section>

        <Accordion
          title="Personal details"
          icon={UserRound}
          open={openSection === "personal"}
          onToggle={() => toggle("personal")}
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="First name">
              <input value={firstName} disabled className={creamInput} />
            </Field>
            <Field label="Last name">
              <input value={lastName} disabled className={creamInput} />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <input value={user?.email || ""} disabled className={creamInput} />
            </Field>
            <Field label="Mobile" className="sm:col-span-2">
              <input
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
                className={creamInput}
              />
            </Field>
          </div>
          <div className="mt-4">
            <p className="font-saveful-bold text-sm text-gray-900">Password</p>
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="mt-2 inline-flex items-center gap-2 font-saveful-semibold text-sm text-saveful-green"
            >
              <Lock className="h-4 w-4" />
              Change password
              <ChevronRight className="h-4 w-4" />
            </button>
            {showPassword ? (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  type="password"
                  placeholder="Current password"
                  value={password.current}
                  onChange={(event) => setPassword((prev) => ({ ...prev, current: event.target.value }))}
                  className={creamInput}
                />
                <input
                  type="password"
                  placeholder="New password"
                  value={password.next}
                  onChange={(event) => setPassword((prev) => ({ ...prev, next: event.target.value }))}
                  className={creamInput}
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  value={password.confirm}
                  onChange={(event) => setPassword((prev) => ({ ...prev, confirm: event.target.value }))}
                  className={creamInput}
                />
                <Button type="button" className="w-full sm:col-span-3 sm:w-auto">
                  Update password
                </Button>
              </div>
            ) : null}
          </div>
        </Accordion>

        <Accordion
          title="Notifications"
          icon={Bell}
          open={openSection === "notifications"}
          onToggle={() => toggle("notifications")}
        >
          <p className="mb-4 font-saveful text-sm text-gray-500">
            Allow Saveful for Business to send prompts about food surplus and collections.
          </p>
          <ToggleRow
            label="Claims and collections"
            description="When a charity or farmer claims surplus from one of your sites"
            checked={notifyClaims}
            onChange={setNotifyClaims}
          />
          <ToggleRow
            label="Pickup updates"
            description="Reminders as pickup windows open and close"
            checked={notifyPickups}
            onChange={setNotifyPickups}
          />
          <ToggleRow
            label="Nearby listing alerts"
            description="Useful if you also collect surplus from other businesses"
            checked={notifyNearby}
            onChange={setNotifyNearby}
          />
        </Accordion>

        <Accordion
          title="Business details"
          icon={Building2}
          open={openSection === "business"}
          onToggle={() => toggle("business")}
        >
          <div className="space-y-4">
            <Field label="Name">
              <input value={demoOrganization.name} disabled className={creamInput} />
            </Field>
            <Field label="Address / location">
              <p className="mb-2 font-saveful text-xs text-gray-500">
                Update address so latitude and longitude stay accurate for pickups.
              </p>
              <div className="relative">
                <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  className={cn(creamInput, "pl-10")}
                />
              </div>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Registration no.">
                <input
                  value={registration}
                  onChange={(event) => setRegistration(event.target.value)}
                  className={creamInput}
                />
              </Field>
              <Field label="Venue type">
                <select
                  value={venueType}
                  onChange={(event) => setVenueType(event.target.value)}
                  className={creamInput}
                >
                  {VENUE_TYPES.map((item) => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        </Accordion>

        <Accordion
          title="Extra info (branding + logo)"
          icon={Palette}
          open={openSection === "extra"}
          onToggle={() => toggle("extra")}
        >
          <Field label="Branding">
            <input
              value={branding}
              onChange={(event) => setBranding(event.target.value)}
              className={creamInput}
            />
          </Field>
          <div className="mt-4">
            <p className="font-saveful-semibold text-sm text-gray-900">Logo</p>
            <p className="mt-1 font-saveful text-xs text-gray-500">
              Centre your subject — the logo displays as a circle in the app
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                handleLogo(event.target.files);
                event.target.value = "";
              }}
            />
            {logo ? (
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative h-20 w-20 overflow-hidden rounded-full ring-1 ring-black/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={logo} alt="" className="h-full w-full object-cover" />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                    Replace
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => {
                      URL.revokeObjectURL(logo);
                      setLogo(null);
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-[#F5F1E8] px-4 py-8 font-saveful-semibold text-sm text-gray-600"
              >
                <ImagePlus className="h-4 w-4" />
                Select from gallery
              </button>
            )}
          </div>
        </Accordion>

        <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
          {[
            { href: "/plans", label: "Plans" },
            { href: "/plans", label: "Manage billing" },
            { href: "/users", label: "Manage access" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 font-saveful text-sm text-gray-800 last:border-b-0 hover:bg-[#F7F6F2]"
            >
              {item.label}
              <ChevronRight className="h-4 w-4 text-gray-400" />
            </Link>
          ))}
          {[
            { label: "Privacy Policy", url: "https://www.saveful.com/privacy-policy" },
            { label: "Terms of Service", url: "https://www.saveful.com/saveful-for-business-terms-conditions" },
            { label: "FAQ", url: "https://www.saveful.com/faq#saveful-for-business-faq" },
          ].map((item) => (
            <a
              key={item.label}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 font-saveful text-sm text-gray-800 last:border-b-0 hover:bg-[#F7F6F2]"
            >
              {item.label}
              <ExternalLink className="h-4 w-4 text-gray-400" />
            </a>
          ))}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="secondary" className="w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            Log out
          </Button>
          <Button
            variant="secondary"
            className="w-full text-red-600 hover:bg-red-50"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 className="h-4 w-4" />
            Delete my account
          </Button>
        </div>

        {confirmDelete ? (
          <div className="rounded-2xl border border-red-100 bg-red-50 p-4">
            <p className="font-saveful-semibold text-sm text-red-800">
              Are you sure you want to delete your account?
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                className="w-full bg-red-600 hover:bg-red-700 sm:w-auto"
                onClick={handleLogout}
              >
                Delete
              </Button>
              <Button variant="secondary" className="w-full sm:w-auto" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </AppPage>
  );
}

function Accordion({
  title,
  icon: Icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: typeof UserRound;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        <span className="flex items-center gap-2 font-saveful-semibold text-sm text-gray-900">
          <Icon className="h-4 w-4 text-saveful-green" />
          {title}
        </span>
        {open ? <Minus className="h-4 w-4 text-gray-400" /> : <Plus className="h-4 w-4 text-gray-400" />}
      </button>
      {open ? <div className="border-t border-gray-100 px-4 py-5 sm:px-5">{children}</div> : null}
    </div>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="mb-1.5 block font-saveful-semibold text-sm text-gray-900">{label}</label>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="font-saveful-semibold text-sm text-gray-900">{label}</p>
        <p className="mt-0.5 font-saveful text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-saveful-green" : "bg-gray-200",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-5" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
