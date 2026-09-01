"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Eye, EyeOff, MapPin, UserRound } from "lucide-react";
import { BusinessGate } from "@/components/business/BusinessGate";
import { AddressPicker, type PickedLocation } from "@/components/sites/AddressPicker";
import { PortalPageShell } from "@/components/ui/Portal";
import { Button } from "@/components/ui/button";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";
import { ApiError } from "@/lib/api";
import { createBusinessSite, getBusinessOrganisation, inviteSiteManager } from "@/lib/businessApi";
import { useEntitlements } from "@/lib/businessBilling";
import { extractCreatedSiteId, parseLiveSiteId } from "@/lib/businessHqSite";
import { statusLabel } from "@/lib/businessTypes";
import { cn } from "@/lib/utils";

const MIN_PASSWORD_LENGTH = 8;

type FieldKey =
  | "siteName"
  | "address"
  | "firstName"
  | "lastName"
  | "email"
  | "mobile"
  | "password"
  | "confirmPassword";

export default function BusinessAddLocationPage() {
  return (
    <BusinessGate>
      <Suspense fallback={<SavefulPageLoader message="Opening add location…" fullScreen={false} />}>
        <AddLocationInner />
      </Suspense>
    </BusinessGate>
  );
}

function AddLocationInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { entitlements } = useEntitlements();
  const isAssignMode = searchParams.get("mode") === "manager";
  const assignSiteId = parseLiveSiteId(searchParams.get("siteId"));

  const billedLocked = Boolean(entitlements && !entitlements.entitled);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [createdSiteId, setCreatedSiteId] = useState<number | null>(null);
  const [assignSite, setAssignSite] = useState<{ id: number; siteName: string; address: string } | null>(null);

  const [siteName, setSiteName] = useState("");
  const [place, setPlace] = useState<PickedLocation>({ address: "", postcode: "", lat: NaN, lon: NaN });
  const [manager, setManager] = useState({
    firstName: "",
    lastName: "",
    email: "",
    mobile: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!isAssignMode || !assignSiteId) return;
    void getBusinessOrganisation()
      .then((payload) => {
        const site = (payload.sites ?? []).find((row) => row.id === assignSiteId);
        if (site) {
          setAssignSite({
            id: site.id,
            siteName: site.siteName,
            address: site.address || "",
          });
        }
      })
      .catch(() => undefined);
  }, [isAssignMode, assignSiteId]);

  const clearField = (key: FieldKey) => {
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
    if (formError) setFormError("");
  };

  const managerErrors = () => {
    const next: Partial<Record<FieldKey, string>> = {};
    if (!manager.firstName.trim()) next.firstName = "Please enter a first name.";
    if (!manager.lastName.trim()) next.lastName = "Please enter a last name.";
    if (!manager.email.trim()) next.email = "Please enter an email.";
    if (!manager.password) next.password = "Please enter a password.";
    else if (manager.password.length < MIN_PASSWORD_LENGTH) {
      next.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!manager.confirmPassword) next.confirmPassword = "Please confirm the password.";
    else if (manager.password && manager.password !== manager.confirmPassword) {
      next.confirmPassword = "Passwords do not match.";
    }
    return next;
  };

  const assign = async (siteId: number) => {
    await inviteSiteManager(siteId, {
      firstName: manager.firstName.trim(),
      lastName: manager.lastName.trim(),
      email: manager.email.trim().toLowerCase(),
      password: manager.password,
      ...(manager.mobile.trim() ? { phoneNumber: manager.mobile.trim() } : {}),
    });
  };

  const submitCreate = async () => {
    if (busy || billedLocked) return;
    const nextErrors: Partial<Record<FieldKey, string>> = createdSiteId
      ? {}
      : {
          ...(!siteName.trim() ? { siteName: "Please enter a site name." } : {}),
          ...(!place.address.trim() || !Number.isFinite(place.lat) || !Number.isFinite(place.lon)
            ? { address: "Please set the site location on the map." }
            : !place.postcode.trim()
              ? {
                  address:
                    "We could not detect a postcode from this pin. Search for a full address and try again.",
                }
              : {}),
        };
    Object.assign(nextErrors, managerErrors());
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError("Please fix the highlighted fields and try again.");
      return;
    }

    setFieldErrors({});
    setFormError("");
    setBusy(true);
    let siteId = createdSiteId;
    try {
      if (!siteId) {
        const created = await createBusinessSite({
          siteName: siteName.trim(),
          address: place.address.trim(),
          postcode: place.postcode.trim(),
          latitude: place.lat,
          longitude: place.lon,
        });
        siteId = extractCreatedSiteId(created);
        if (!siteId) throw new Error("Location was created but the server response was missing an id");
        setCreatedSiteId(siteId);
      }
      await assign(siteId);
      router.replace("/business/home");
    } catch (err) {
      const message = err instanceof ApiError || err instanceof Error ? err.message : "Could not add location.";
      if (siteId) {
        setFormError(
          `${message} Location is already saved. Fix the manager details below and tap Assign manager — the location will not be created again.`,
        );
      } else {
        setFormError(message);
      }
    } finally {
      setBusy(false);
    }
  };

  const submitAssign = async () => {
    if (busy || billedLocked || !assignSiteId) return;
    const nextErrors = managerErrors();
    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError("Please fix the highlighted fields and try again.");
      return;
    }
    setFieldErrors({});
    setFormError("");
    setBusy(true);
    try {
      await assign(assignSiteId);
      router.replace("/business/home");
    } catch (err) {
      setFormError(err instanceof ApiError || err instanceof Error ? err.message : "Could not assign manager.");
    } finally {
      setBusy(false);
    }
  };

  const locationSaved = createdSiteId != null;
  const locationReady = Boolean(siteName.trim() && place.address.trim() && Number.isFinite(place.lat));
  const submitLabel = isAssignMode
    ? busy
      ? "Assigning…"
      : "Assign manager"
    : busy
      ? locationSaved
        ? "Assigning manager…"
        : "Adding location…"
      : locationSaved
        ? "Assign manager"
        : "Add location & manager";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (isAssignMode) void submitAssign();
    else void submitCreate();
  };

  return (
    <PortalPageShell className="!space-y-4">
      <form onSubmit={onSubmit} className={cn("mx-auto w-full", isAssignMode ? "max-w-3xl" : "max-w-6xl")}>
        <header className="mb-4 flex flex-col gap-4 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <Link
              href="/business/home"
              className="mb-2 inline-flex items-center gap-1.5 font-saveful-semibold text-xs text-gray-500 hover:text-gray-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to home
            </Link>
            <h1 className="font-saveful-bold text-2xl leading-tight text-gray-900 sm:text-[1.75rem]">
              {isAssignMode ? "Assign site manager" : "Add location"}
            </h1>
            <p className="mt-1.5 max-w-xl font-saveful text-sm text-gray-500">
              {isAssignMode
                ? "Create a login for the person who will run this site."
                : "Set the site on the map, then add the manager who will run it. Both are saved together."}
            </p>
            {!isAssignMode ? (
              <ol className="mt-3 flex flex-wrap items-center gap-2">
                <StepChip
                  step={1}
                  label="Location"
                  done={locationSaved || locationReady}
                  current={!locationSaved}
                />
                <span className="hidden h-px w-6 bg-gray-200 sm:block" aria-hidden />
                <StepChip step={2} label="Manager" done={false} current={locationSaved} />
              </ol>
            ) : null}
          </div>
          <Link
            href="/business/home"
            className="hidden h-10 shrink-0 items-center rounded-xl border border-black/[0.06] bg-white px-4 font-saveful-semibold text-sm text-gray-700 hover:bg-[#F7F6F2] sm:inline-flex"
          >
            Cancel
          </Link>
        </header>

        {billedLocked ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 font-saveful text-sm text-amber-900">
            {statusLabel(entitlements?.status ?? null)}
            {entitlements?.planDisplayName ? ` · ${entitlements.planDisplayName}` : ""}
            {" — extra sites stay locked until this organisation is on a trial or plan. "}
            <Link href="/business/plans" className="font-saveful-semibold underline">
              View plans
            </Link>
          </p>
        ) : null}

        {formError ? (
          <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 font-saveful text-sm text-red-700">
            {formError}
          </p>
        ) : null}

        {isAssignMode ? (
          <div className="space-y-4">
            <section className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
              <div className="flex items-start gap-3 rounded-xl border border-[#D8EBDF] bg-[#F4FAF6] px-3.5 py-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-saveful-green shadow-sm">
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="font-saveful text-[11px] uppercase tracking-wide text-gray-500">Site</p>
                  <p className="mt-0.5 font-saveful-semibold text-sm text-gray-900">
                    {assignSite?.siteName || "Loading site…"}
                  </p>
                  {assignSite?.address ? (
                    <p className="mt-0.5 font-saveful text-xs text-gray-500">{assignSite.address}</p>
                  ) : null}
                </div>
              </div>
            </section>
            <section className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
              <SectionHeading
                icon={UserRound}
                title="Site manager"
                subtitle="They receive an email with this login after you assign them."
              />
              <ManagerFields
                values={manager}
                errors={fieldErrors}
                onChange={(key, value) => {
                  clearField(key);
                  setManager((current) => ({ ...current, [key]: value }));
                }}
              />
            </section>
          </div>
        ) : (
          <div className="grid items-start gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
              <SectionHeading
                icon={MapPin}
                step={1}
                title="Location"
                subtitle="Name the site and drop a pin so collections can find it."
              />
              {locationSaved ? (
                <div className="rounded-xl border border-[#D8EBDF] bg-[#F4FAF6] px-4 py-3.5">
                  <p className="inline-flex items-center gap-1.5 font-saveful-semibold text-xs text-saveful-green">
                    <Check className="h-3.5 w-3.5" />
                    Location saved
                  </p>
                  <p className="mt-1.5 font-saveful-semibold text-sm text-gray-900">
                    {siteName || "New location"}
                  </p>
                  {place.address ? (
                    <p className="mt-0.5 font-saveful text-xs text-gray-500">{place.address}</p>
                  ) : null}
                  <p className="mt-2 font-saveful text-xs text-gray-500">
                    Only the manager step is left. This will not create another location.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Field
                    label="Site name"
                    value={siteName}
                    error={fieldErrors.siteName}
                    placeholder="e.g. Town Hall kitchen"
                    onChange={(value) => {
                      clearField("siteName");
                      setSiteName(value);
                    }}
                  />
                  <div>
                    <p className="mb-1 block font-saveful-semibold text-xs text-gray-700">Site location</p>
                    <p className="mb-2.5 font-saveful text-xs text-gray-500">
                      Search an address or use your current location. A postcode is required.
                    </p>
                    <AddressPicker
                      value={place}
                      onChange={(next) => {
                        clearField("address");
                        setPlace(next);
                      }}
                      compact
                      error={fieldErrors.address}
                    />
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-black/[0.05] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5">
              <SectionHeading
                icon={UserRound}
                step={2}
                title="Site manager"
                subtitle={
                  locationSaved
                    ? "Update the details if needed, then assign the manager."
                    : "A manager account is created with this location. We email them this login."
                }
              />
              <ManagerFields
                values={manager}
                errors={fieldErrors}
                onChange={(key, value) => {
                  clearField(key);
                  setManager((current) => ({ ...current, [key]: value }));
                }}
              />
            </section>
          </div>
        )}

        <div className="sticky bottom-0 -mx-4 mt-5 border-t border-black/[0.04] bg-[#F7F6F2]/95 px-4 py-3 backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:py-0 sm:backdrop-blur-none">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <Link
              href="/business/home"
              className="inline-flex h-11 items-center justify-center rounded-xl border border-black/[0.06] bg-white px-4 font-saveful-semibold text-sm text-gray-700 hover:bg-white sm:h-10"
            >
              Cancel
            </Link>
            <Button
              type="submit"
              disabled={busy || billedLocked || (isAssignMode && !assignSite)}
              className="h-11 w-full sm:h-10 sm:w-auto sm:min-w-[13rem]"
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </form>
    </PortalPageShell>
  );
}

function StepChip({
  step,
  label,
  done,
  current,
}: {
  step: number;
  label: string;
  done: boolean;
  current: boolean;
}) {
  return (
    <li
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-saveful-semibold text-xs",
        done
          ? "bg-[#E8F6EC] text-saveful-green"
          : current
            ? "bg-white text-gray-800 ring-1 ring-black/[0.08]"
            : "bg-white/70 text-gray-500 ring-1 ring-black/[0.05]",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 items-center justify-center rounded-full text-[10px]",
          done ? "bg-saveful-green text-white" : "bg-gray-200 text-gray-600",
        )}
      >
        {done ? <Check className="h-2.5 w-2.5" /> : step}
      </span>
      {label}
    </li>
  );
}

function SectionHeading({
  icon: Icon,
  step,
  title,
  subtitle,
}: {
  icon: typeof MapPin;
  step?: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-4 flex items-start gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 text-saveful-green">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <h2 className="font-saveful-bold text-base text-gray-900">
          {step ? <span className="mr-1.5 text-gray-400">{step}.</span> : null}
          {title}
        </h2>
        <p className="mt-0.5 font-saveful text-xs leading-relaxed text-gray-500">{subtitle}</p>
      </div>
    </div>
  );
}

function ManagerFields({
  values,
  errors,
  onChange,
}: {
  values: {
    firstName: string;
    lastName: string;
    email: string;
    mobile: string;
    password: string;
    confirmPassword: string;
  };
  errors: Partial<Record<FieldKey, string>>;
  onChange: (key: keyof typeof values, value: string) => void;
}) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2">
      <Field
        label="First name"
        value={values.firstName}
        error={errors.firstName}
        onChange={(value) => onChange("firstName", value)}
      />
      <Field
        label="Last name"
        value={values.lastName}
        error={errors.lastName}
        onChange={(value) => onChange("lastName", value)}
      />
      <Field
        label="Email"
        type="email"
        value={values.email}
        error={errors.email}
        onChange={(value) => onChange("email", value)}
      />
      <Field
        label="Mobile"
        optional
        value={values.mobile}
        error={errors.mobile}
        placeholder="Optional"
        onChange={(value) => onChange("mobile", value)}
      />
      <Field
        label="Password"
        type="password"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        value={values.password}
        error={errors.password}
        onChange={(value) => onChange("password", value)}
      />
      <Field
        label="Confirm password"
        type="password"
        placeholder="Re-enter password"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onChange={(value) => onChange("confirmPassword", value)}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  error,
  type = "text",
  placeholder,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  placeholder?: string;
  optional?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  const isPassword = type === "password";
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between font-saveful-semibold text-xs text-gray-700">
        <span>{label}</span>
        {optional ? <span className="font-saveful text-[11px] text-gray-400">Optional</span> : null}
      </span>
      <span className="relative block">
        <input
          type={isPassword && visible ? "text" : type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder || `Enter ${label.toLowerCase()}`}
          className={cn(
            "h-11 w-full rounded-xl border bg-[#F7F6F2] px-3.5 font-saveful text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:bg-white",
            isPassword && "pr-11",
            error ? "border-red-300 focus:border-red-400" : "border-[#E4E0D6] focus:border-saveful-green/45",
          )}
        />
        {isPassword ? (
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        ) : null}
      </span>
      {error ? <p className="mt-1 font-saveful text-xs text-red-600">{error}</p> : null}
    </label>
  );
}
