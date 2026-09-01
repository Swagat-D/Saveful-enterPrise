"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";
import { BusinessLogoField } from "@/components/business/BusinessLogoField";
import { AddressPicker, type PickedLocation } from "@/components/sites/AddressPicker";
import { ApiError } from "@/lib/api";
import { checkBusinessEmailRegistered, registerBusiness, registerFarmerProducer } from "@/lib/businessApi";
import { appendSignupLogo } from "@/lib/businessLogo";
import {
  BUSINESS_ROLES,
  FARM_VENUES,
  RESTAURANT_VENUES,
  parseBusinessRole,
} from "@/lib/businessTypes";
import { COUNTRY_CODES, findCountryByIso, formatMobileWithCountryCode } from "@/lib/countryCodes";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none placeholder:text-gray-400 focus:border-saveful-green/40 focus:bg-white";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;
const TERMS_HREF = "https://www.saveful.com/saveful-for-business-terms-conditions";
const PRIVACY_HREF = "https://www.saveful.com/privacy-policy";
const EMAIL_ALREADY_REGISTERED_MESSAGE = "An account with this email already exists. Try signing in instead.";

export default function BusinessRegisterWizardPage() {
  const params = useParams<{ role: string }>();
  const router = useRouter();
  const role = parseBusinessRole(params.role);
  const meta = role ? BUSINESS_ROLES[role] : null;
  const isFarm = role === "farm_business";

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [countryIso, setCountryIso] = useState("AU");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [branding, setBranding] = useState("");
  const [place, setPlace] = useState<PickedLocation>({ address: "", postcode: "", lat: NaN, lon: NaN });
  const [venueType, setVenueType] = useState("");
  const [region, setRegion] = useState("AU");
  const [logo, setLogo] = useState<File | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  if (!role || !meta) {
    return (
      <div className="rounded-2xl bg-white p-6">
        <p className="font-saveful text-sm text-gray-600">That organisation type is not available here.</p>
        <Link href="/business/register" className="mt-3 inline-block font-saveful-semibold text-saveful-green">
          Choose a type
        </Link>
      </div>
    );
  }

  const venues = isFarm ? FARM_VENUES : RESTAURANT_VENUES;
  const country = findCountryByIso(countryIso) ?? COUNTRY_CODES[0];
  const stepTitle = step === 1 ? "Your Details" : step === 2 ? (isFarm ? "Farm Details" : "Business Details") : "Venue & Region";

  const validateStep = () => {
    if (step === 1) {
      if (!firstName.trim()) return "Please enter your first name.";
      if (!lastName.trim()) return "Please enter your last name.";
      if (!email.trim()) return "Please enter your email address.";
      if (!EMAIL_REGEX.test(email.trim())) return "Please enter a valid email address.";
      if (mobile.trim()) {
        const digits = mobile.replace(/\D/g, "");
        if (digits.length < 8 || digits.length > 15) return "Please enter a valid mobile number.";
      }
      if (!password) return "Please enter a password.";
      if (password.length < MIN_PASSWORD_LENGTH) {
        return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
      }
      if (!confirmPassword) return "Please confirm your password.";
      if (password !== confirmPassword) return "Passwords do not match. Please re-enter.";
    }
    if (step === 2) {
      if (!acceptTerms) return "Please accept the Terms & Conditions to continue.";
      if (!businessName.trim()) return isFarm ? "Please enter your farm or business name." : "Please enter your business name.";
      if (!place.address.trim()) return isFarm ? "Please enter your farm address." : "Please enter your business address.";
      if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
        return isFarm
          ? "Please set your farm location using Location Recommendation."
          : "Please set your business location using Location Recommendation.";
      }
      if (!isFarm && !registrationNumber.trim()) return "Please enter your business registration number.";
    }
    if (step === 3) {
      if (!acceptTerms) return "Please accept the Terms & Conditions to continue.";
      if (!venueType.trim()) return "Please select a venue type.";
      if (region !== "AU" && region !== "IN") return "Please select your operating region.";
    }
    return "";
  };

  const submit = async () => {
    const message = validateStep();
    if (message) {
      setError(message);
      return;
    }
    setError("");
    if (step === 1) {
      setSaving(true);
      try {
        const taken = await checkBusinessEmailRegistered(email.trim().toLowerCase());
        if (taken) {
          setError(EMAIL_ALREADY_REGISTERED_MESSAGE);
          return;
        }
        setStep(2);
      } catch {
        setStep(2);
      } finally {
        setSaving(false);
      }
      return;
    }
    if (step === 2) {
      setStep(3);
      return;
    }

    const form = new FormData();
    form.append("firstName", firstName.trim());
    form.append("lastName", lastName.trim());
    form.append("email", email.trim().toLowerCase());
    form.append("password", password);
    const digits = mobile.replace(/\D/g, "");
    const phone = digits ? formatMobileWithCountryCode(country.dialCode, mobile) : "";
    form.append(isFarm ? "mobileNumber" : "mobile", phone);
    form.append("businessName", businessName.trim());
    form.append("businessAddress", place.address.trim());
    form.append("brandName", branding.trim());
    if (!isFarm) form.append("registrationNumber", registrationNumber.trim());
    form.append("orgType", meta.orgType);
    if (venueType.trim()) form.append("venueType", venueType);
    form.append("region", region);
    form.append("latitude", String(place.lat));
    form.append("longitude", String(place.lon));
    if (logo) appendSignupLogo(form, logo);

    setSaving(true);
    try {
      if (isFarm) await registerFarmerProducer(form);
      else await registerBusiness(form);
      router.push(`/business/verify?email=${encodeURIComponent(email.trim().toLowerCase())}&role=${role}`);
    } catch (err) {
      const raw = err instanceof ApiError || err instanceof Error ? err.message.trim() : "";
      if (!raw || /unable to reach|failed to fetch|internal server error|TURBOPACK|is not a function/i.test(raw)) {
        setError("We couldn't create your account. Check your details and try again.");
      } else {
        setError(raw);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-black/[0.05] bg-white p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-2 font-saveful text-xs text-gray-500">
        {["Your Details", isFarm ? "Farm Details" : "Business Details", "Venue & Region"].map((label, index) => (
          <span key={label} className={step === index + 1 ? "font-saveful-semibold text-saveful-green" : undefined}>
            {index + 1}. {label}
          </span>
        ))}
      </div>
      <h1 className="font-saveful-bold text-2xl text-gray-900">{stepTitle}</h1>
      <p className="mt-1 font-saveful text-sm text-gray-500">{meta.title}</p>

      <div className="mt-6 space-y-4">
        {step === 1 ? (
          <>
            <Field label="First Name" placeholder="Enter first name" value={firstName} onChange={setFirstName} />
            <Field label="Last Name" placeholder="Enter last name" value={lastName} onChange={setLastName} />
            <Field label="Email" placeholder="Enter email" type="email" value={email} onChange={setEmail} />
            <div>
              <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Mobile number (optional)</span>
              <div className="flex gap-2">
                <select
                  value={countryIso}
                  onChange={(event) => setCountryIso(event.target.value)}
                  className="h-11 rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-2 font-saveful text-sm"
                >
                  {COUNTRY_CODES.map((item) => (
                    <option key={item.iso} value={item.iso}>
                      {item.flag} {item.dialCode}
                    </option>
                  ))}
                </select>
                <input
                  value={mobile}
                  onChange={(event) => setMobile(event.target.value.replace(/[^\d]/g, "").slice(0, 15))}
                  placeholder="Enter mobile number"
                  inputMode="numeric"
                  className={fieldClass}
                />
              </div>
              <p className="mt-1.5 font-saveful text-xs text-gray-500">
                Add a mobile number if you&apos;d like collecting organisations to be able to contact you about a collection.
              </p>
            </div>
            <PasswordField
              label="Password"
              placeholder="At least 8 characters"
              value={password}
              onChange={setPassword}
              show={showPassword}
              onShow={() => setShowPassword((value) => !value)}
            />
            <PasswordField
              label="Confirm Password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              show={showConfirmPassword}
              onShow={() => setShowConfirmPassword((value) => !value)}
            />
          </>
        ) : null}

        {step === 2 ? (
          <>
            <Field
              label={isFarm ? "Farm / Business Name" : "Business Name"}
              placeholder={isFarm ? "Enter farm or business name" : "Enter business name"}
              value={businessName}
              onChange={setBusinessName}
            />
            <div>
              <p className="mb-1.5 font-saveful-semibold text-sm text-gray-800">Location Recommendation</p>
              <p className="mb-2 font-saveful text-xs text-gray-500">
                Verify your address with map search so collectors can find you when picking up.
              </p>
              <AddressPicker
                value={place}
                onChange={(next) => setPlace(next)}
                compact
              />
            </div>
            <Field
              label={isFarm ? "Farm Address" : "Address"}
              placeholder={isFarm ? "Enter farm address" : "Enter address"}
              value={place.address}
              onChange={(value) => setPlace((current) => ({ ...current, address: value }))}
            />
            {!isFarm ? (
              <Field
                label="Business Registration number (eg ABN)"
                placeholder="Enter number"
                value={registrationNumber}
                onChange={setRegistrationNumber}
              />
            ) : null}
            <Field label="Branding" placeholder="Brand name" value={branding} onChange={setBranding} optional />
            <BusinessLogoField file={logo} onFile={setLogo} />
            <label className="flex items-start gap-2.5 font-saveful text-sm text-gray-700">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 accent-saveful-green"
              />
              <span>
                By continuing, I agree to the Saveful for Business{" "}
                <a href={TERMS_HREF} target="_blank" rel="noreferrer" className="font-saveful-semibold text-saveful-green underline">
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a href={PRIVACY_HREF} target="_blank" rel="noreferrer" className="font-saveful-semibold text-saveful-green underline">
                  Privacy Policy
                </a>
                . We&apos;ll send you important updates - you can opt out any time.
              </span>
            </label>
          </>
        ) : null}

        {step === 3 ? (
          <>
            <Field label="Please select Venue Type *">
              <select value={venueType} onChange={(event) => setVenueType(event.target.value)} className={fieldClass}>
                <option value="">Select…</option>
                {venues.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </Field>
            <div>
              <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Operating region</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  { value: "AU", label: "Australia", description: "Organisations operating in Australia" },
                  { value: "IN", label: "India", description: "Organisations operating in India" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setRegion(item.value)}
                    className={`rounded-xl border px-3 py-3 text-left ${
                      region === item.value ? "border-saveful-green bg-saveful-green/5" : "border-black/[0.06] bg-[#F7F6F2]"
                    }`}
                  >
                    <p className="font-saveful-semibold text-sm text-gray-900">{item.label}</p>
                    <p className="mt-0.5 font-saveful text-xs text-gray-500">{item.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-xl bg-saveful-green/5 px-3 py-2.5 font-saveful text-xs text-gray-600">
              Surplus will only be shown to charities and consumers registered in the same region. Pick the region where
              your organisation operates.
            </div>
          </>
        ) : null}
      </div>

      {error ? (
        <div className="mt-4">
          <p className="font-saveful text-sm text-amber-700">{error}</p>
          {error === EMAIL_ALREADY_REGISTERED_MESSAGE ? (
            <Link href="/login?portal=business" className="mt-2 inline-block font-saveful-semibold text-sm text-saveful-green">
              Go to Sign in
            </Link>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        disabled={saving || (step >= 2 && !acceptTerms)}
        onClick={() => void submit()}
        className="mt-6 h-12 w-full rounded-xl bg-saveful-green font-saveful-semibold uppercase tracking-wide text-white disabled:opacity-50"
      >
        {saving ? (step < 3 ? "Checking..." : "Creating...") : step < 3 ? "Continue" : "Create account"}
      </button>
      {step === 3 && !isFarm ? (
        <p className="mt-3 text-center font-saveful text-xs text-gray-500">No payment required to get started</p>
      ) : null}

      <div className="mt-4 flex items-center justify-between">
        {step > 1 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="font-saveful-semibold text-sm text-gray-600">
            Back
          </button>
        ) : (
          <Link href="/business/register" className="font-saveful-semibold text-sm text-gray-600">
            Back
          </Link>
        )}
        <Link href="/login?portal=business" className="font-saveful-semibold text-sm text-saveful-green">
          Already have an account? Sign in
        </Link>
      </div>
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  show,
  onShow,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  show: boolean;
  onShow: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">{label}</span>
      <span className="relative block">
        <input
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          className={`${fieldClass} pr-20`}
        />
        <button
          type="button"
          onClick={onShow}
          className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1 font-saveful text-sm text-gray-500 hover:text-saveful-green"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {show ? "Hide" : "Show"}
        </button>
      </span>
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  optional,
  children,
}: {
  label: string;
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  optional?: boolean;
  children?: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">
        {label}
        {optional ? <span className="ml-1 font-saveful text-xs text-gray-400">optional</span> : null}
      </span>
      {children ?? (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          className={fieldClass}
        />
      )}
    </label>
  );
}
