"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { AddressPicker, defaultMapLocation, type PickedLocation } from "@/components/sites/AddressPicker";

const MIN_PASSWORD_LENGTH = 8;
const creamInput =
  "h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-4 font-saveful text-sm text-[#1a1a1a] outline-none transition placeholder:text-[#6B6B6B]/50 focus:border-[#A68FD9] focus:bg-white";

type FieldKey =
  | "siteName"
  | "address"
  | "postcode"
  | "firstName"
  | "lastName"
  | "email"
  | "mobile"
  | "password"
  | "confirmPassword";

export default function CreateSitePage() {
  const router = useRouter();
  const [siteName, setSiteName] = useState("");
  const [place, setPlace] = useState<PickedLocation>({ ...defaultMapLocation, address: "", postcode: "" });
  const [manager, setManager] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [saving, setSaving] = useState(false);

  const clearError = (key: FieldKey) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!siteName.trim()) next.siteName = "Please enter a site name.";
    if (!place.address.trim()) next.address = "Please search or enter a pickup address.";
    if (!place.postcode.trim()) next.postcode = "Please enter a postcode.";
    if (!manager.firstName.trim()) next.firstName = "Please enter a first name.";
    if (!manager.lastName.trim()) next.lastName = "Please enter a last name.";
    if (!manager.email.trim()) next.email = "Please enter an email.";
    if (!manager.mobile.trim()) next.mobile = "Please enter a mobile number.";
    if (!manager.password) next.password = "Please enter a password.";
    else if (manager.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!manager.confirmPassword) next.confirmPassword = "Please confirm the password.";
    else if (manager.password !== manager.confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    return next;
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const nextErrors = validate();
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setSaving(true);
    window.setTimeout(() => router.push("/sites"), 400);
  };

  return (
    <AppPage
      eyebrow="Locations"
      title="Add location"
      description="Set up the location, map pin, and manager in one step."
    >
      <form onSubmit={handleSubmit} className="w-full max-w-6xl space-y-4 md:space-y-5">
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 xl:items-start xl:gap-5">
          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
            <h2 className="font-saveful-bold text-lg text-gray-900">Site details</h2>
            <p className="mt-1 font-saveful text-sm text-gray-500">
              Name the kitchen, then search the map so pickup directions are right.
            </p>

            <div className="mt-6 space-y-5">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
                <Field label="Site name" htmlFor="siteName" error={errors.siteName}>
                  <input
                    id="siteName"
                    value={siteName}
                    onChange={(event) => {
                      setSiteName(event.target.value);
                      clearError("siteName");
                    }}
                    placeholder="Enter site name"
                    className={creamInput}
                  />
                </Field>
                <Field label="Postcode" htmlFor="postcode" error={errors.postcode}>
                  <input
                    id="postcode"
                    value={place.postcode}
                    onChange={(event) => {
                      setPlace((prev) => ({ ...prev, postcode: event.target.value }));
                      clearError("postcode");
                    }}
                    placeholder="Auto-filled from the map"
                    className={creamInput}
                  />
                </Field>
              </div>

              <div>
                <p className="mb-2 font-saveful-semibold text-sm text-gray-900">Pickup location</p>
                <AddressPicker
                  value={place}
                  error={errors.address}
                  onChange={(next) => {
                    setPlace(next);
                    clearError("address");
                    if (next.postcode) clearError("postcode");
                  }}
                />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
            <h2 className="font-saveful-bold text-lg text-gray-900">Site manager</h2>
            <p className="mt-1 font-saveful text-sm text-gray-500">
              A manager account is created with this location. After you tap Add location, we email them their login email and password.
            </p>

            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="First name" htmlFor="firstName" error={errors.firstName}>
                <input
                  id="firstName"
                  value={manager.firstName}
                  onChange={(event) => {
                    setManager((prev) => ({ ...prev, firstName: event.target.value }));
                    clearError("firstName");
                  }}
                  placeholder="Enter first name"
                  className={creamInput}
                />
              </Field>
              <Field label="Last name" htmlFor="lastName" error={errors.lastName}>
                <input
                  id="lastName"
                  value={manager.lastName}
                  onChange={(event) => {
                    setManager((prev) => ({ ...prev, lastName: event.target.value }));
                    clearError("lastName");
                  }}
                  placeholder="Enter last name"
                  className={creamInput}
                />
              </Field>
              <Field label="Email" htmlFor="email" error={errors.email} className="sm:col-span-2">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={manager.email}
                  onChange={(event) => {
                    setManager((prev) => ({ ...prev, email: event.target.value }));
                    clearError("email");
                  }}
                  placeholder="Enter email"
                  className={creamInput}
                />
              </Field>
              <Field label="Mobile" htmlFor="mobile" error={errors.mobile} className="sm:col-span-2">
                <input
                  id="mobile"
                  type="tel"
                  value={manager.mobile}
                  onChange={(event) => {
                    setManager((prev) => ({ ...prev, mobile: event.target.value }));
                    clearError("mobile");
                  }}
                  placeholder="Enter mobile number"
                  className={creamInput}
                />
              </Field>
              <Field label="Password" htmlFor="password" error={errors.password}>
                <input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={manager.password}
                  onChange={(event) => {
                    setManager((prev) => ({ ...prev, password: event.target.value }));
                    clearError("password");
                  }}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  className={creamInput}
                />
              </Field>
              <Field label="Confirm password" htmlFor="confirmPassword" error={errors.confirmPassword}>
                <input
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={manager.confirmPassword}
                  onChange={(event) => {
                    setManager((prev) => ({ ...prev, confirmPassword: event.target.value }));
                    clearError("confirmPassword");
                  }}
                  placeholder="Re-enter password"
                  className={creamInput}
                />
              </Field>
            </div>

            <div className="mt-6 rounded-xl bg-[#F4FAF6] px-4 py-3">
              <p className="font-saveful text-sm leading-relaxed text-gray-600">
                This person will manage listings and day-to-day operations for this site only.
              </p>
            </div>
          </section>
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" className="w-full sm:w-auto" href="/sites">
            Cancel
          </Button>
          <Button type="submit" className="w-full sm:min-w-56" disabled={saving}>
            {saving ? "Adding location..." : "Add location & manager"}
          </Button>
        </div>
      </form>
    </AppPage>
  );
}

function Field({
  label,
  htmlFor,
  error,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="mb-1.5 block font-saveful-semibold text-sm text-gray-900">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1.5 font-saveful text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
