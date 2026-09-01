"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown, ChevronUp, X } from "lucide-react";
import { ApiError } from "@/lib/api";
import { submitEnterpriseEnquiry } from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import { RESTAURANT_VENUES } from "@/lib/businessTypes";

const BUSINESS_TYPES = [
  ...RESTAURANT_VENUES.filter((item) => item.value !== "OTHER"),
  { label: "Farm", value: "FARM" },
  { label: "Other", value: "OTHER" },
];

const LOCATION_OPTIONS = [
  { id: "10-25", label: "10-25", band: "BAND_10_25" },
  { id: "26-50", label: "26-50", band: "BAND_26_50" },
  { id: "51-100", label: "51-100", band: "BAND_51_100" },
  { id: "100+", label: "100+", band: "BAND_100_PLUS" },
] as const;

const CONTACT_OPTIONS = [
  { id: "asap", label: "As soon as possible", window: "ASAP" },
  { id: "morning", label: "Morning", window: "MORNING" },
  { id: "afternoon", label: "Afternoon", window: "AFTERNOON" },
  { id: "anytime", label: "Any time", window: "ANY_TIME" },
] as const;

const fieldClass =
  "h-10 w-full rounded-lg border border-[#D6D6D0] bg-white px-3 font-saveful text-sm text-gray-900 outline-none focus:border-saveful-green/50";

export function EnterpriseConsultModal({ onClose }: { onClose: () => void }) {
  const [mounted, setMounted] = useState(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-5">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close consultation form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="enterprise-consult-title"
        className="relative flex max-h-[min(92dvh,40rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_80px_rgba(16,24,40,0.28)]"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 hover:bg-[#F7F6F2] hover:text-gray-700"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
          <EnterpriseConsultForm onDone={onClose} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function EnterpriseConsultForm({ onDone }: { onDone?: () => void }) {
  const user = useBusinessSession();
  const initial = useMemo(
    () => ({
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      businessName: user?.organization ?? "",
      businessType: user?.venueType ?? "",
      mobile: user?.phoneNumber ?? "",
    }),
    [user],
  );
  const [details, setDetails] = useState(initial);
  useEffect(() => {
    setDetails((current) => ({
      firstName: current.firstName || initial.firstName,
      lastName: current.lastName || initial.lastName,
      businessName: current.businessName || initial.businessName,
      businessType: current.businessType || initial.businessType,
      mobile: current.mobile || initial.mobile,
    }));
  }, [initial]);
  const [locationBand, setLocationBand] = useState<string | null>(null);
  const [contactWindow, setContactWindow] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState("");

  const typeLabel = BUSINESS_TYPES.find((item) => item.value === details.businessType)?.label || "Select business type";

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (
      !details.firstName.trim() ||
      !details.lastName.trim() ||
      !details.businessName.trim() ||
      !details.businessType.trim() ||
      !details.mobile.trim() ||
      !locationBand ||
      !contactWindow
    ) {
      setError("Please complete all required fields.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const result = await submitEnterpriseEnquiry({
        firstName: details.firstName.trim(),
        lastName: details.lastName.trim(),
        businessName: details.businessName.trim(),
        businessType: details.businessType.trim(),
        mobile: details.mobile.trim(),
        locationBand,
        contactWindow,
        message: notes.trim() || undefined,
      });
      setDone(result.message || "Consultation requested. Your details have been received.");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not submit enquiry.");
    } finally {
      setSaving(false);
    }
  };

  if (done) {
    return (
      <div className="space-y-3 py-8 text-center">
        <h2 className="font-saveful-bold text-xl text-gray-900">Thanks — we&apos;ll be in touch</h2>
        <p className="font-saveful text-sm text-gray-600">{done}</p>
        <p className="font-saveful text-xs text-saveful-green">Consultation requested · Your details received</p>
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="mt-2 inline-flex h-10 items-center justify-center rounded-lg bg-saveful-green px-4 font-saveful-semibold text-sm text-white"
          >
            Back to plans
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="pr-8">
        <h2 id="enterprise-consult-title" className="font-saveful-bold text-lg text-gray-900 sm:text-xl">
          Let&apos;s talk about Enterprise
        </h2>
        <p className="mt-1 font-saveful text-sm text-gray-500">
          We&apos;ll use the details you&apos;ve already provided and contact you to discuss the best
          solution for your business.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-[#E8E4DA] bg-[#FBFBF8] p-3.5">
          <p className="font-saveful-semibold text-xs text-gray-500">Your details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["firstName", "First Name"],
                ["lastName", "Last Name"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block">
                <span className="mb-1 block font-saveful-semibold text-xs text-gray-500">{label}</span>
                <input
                  value={details[key]}
                  onChange={(event) => setDetails((current) => ({ ...current, [key]: event.target.value }))}
                  className={fieldClass}
                  required
                />
              </label>
            ))}
          </div>
          <label className="block">
            <span className="mb-1 block font-saveful-semibold text-xs text-gray-500">Business Name</span>
            <input
              value={details.businessName}
              onChange={(event) => setDetails((current) => ({ ...current, businessName: event.target.value }))}
              className={fieldClass}
              required
            />
          </label>
          <div>
            <p className="mb-1 font-saveful-semibold text-xs text-gray-500">Business Type</p>
            <button
              type="button"
              onClick={() => setTypeOpen((value) => !value)}
              className={`${fieldClass} flex items-center justify-between text-left`}
            >
              <span className={details.businessType ? "text-gray-900" : "text-gray-400"}>{typeLabel}</span>
              {typeOpen ? <ChevronUp className="h-4 w-4 text-saveful-green" /> : <ChevronDown className="h-4 w-4 text-saveful-green" />}
            </button>
            {typeOpen ? (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#D6D6D0] bg-white">
                {BUSINESS_TYPES.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setDetails((current) => ({ ...current, businessType: option.value }));
                      setTypeOpen(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-2 text-left font-saveful text-sm ${
                      details.businessType === option.value ? "bg-[#F3FAF5]" : "hover:bg-[#F7F6F2]"
                    }`}
                  >
                    <span
                      className={`flex h-4 w-4 items-center justify-center rounded-full border ${
                        details.businessType === option.value ? "border-saveful-green" : "border-[#D6D6D0]"
                      }`}
                    >
                      {details.businessType === option.value ? (
                        <span className="h-2 w-2 rounded-full bg-saveful-green" />
                      ) : null}
                    </span>
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <label className="block">
            <span className="mb-1 block font-saveful-semibold text-xs text-gray-500">Mobile</span>
            <input
              value={details.mobile}
              onChange={(event) => setDetails((current) => ({ ...current, mobile: event.target.value }))}
              className={fieldClass}
              inputMode="tel"
              required
            />
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-[#E8E4DA] bg-[#FBFBF8] p-3.5">
          <p className="font-saveful-semibold text-sm text-gray-900">We just need a few more details</p>
          <div>
            <p className="mb-2 font-saveful-semibold text-xs text-gray-500">How many locations do you manage?*</p>
            <div className="grid grid-cols-2 gap-2">
              {LOCATION_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  name="locations"
                  label={option.label}
                  checked={locationBand === option.band}
                  onChange={() => setLocationBand(option.band)}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-saveful-semibold text-xs text-gray-500">When would you like us to contact you?*</p>
            <div className="grid grid-cols-2 gap-2">
              {CONTACT_OPTIONS.map((option) => (
                <Choice
                  key={option.id}
                  name="contact"
                  label={option.label}
                  checked={contactWindow === option.window}
                  onChange={() => setContactWindow(option.window)}
                />
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1 block font-saveful-semibold text-xs text-gray-500">
              Anything you&apos;d like us to know? (Optional)
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="type message here"
              className={`${fieldClass} h-auto py-2`}
            />
          </label>
        </div>
      </div>

      {error ? <p className="font-saveful text-sm text-amber-700">{error}</p> : null}

      <button
        type="submit"
        disabled={saving}
        className="flex h-11 w-full items-center justify-between rounded-xl border border-saveful-green bg-white px-4 font-saveful-bold text-sm text-saveful-green disabled:opacity-50"
      >
        {saving ? "Submitting..." : "Request Enterprise Consultation"}
        <span aria-hidden>→</span>
      </button>
    </form>
  );
}

function Choice({
  name,
  label,
  checked,
  onChange,
}: {
  name: string;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
          checked ? "border-saveful-green bg-[#F3FAF5]" : "border-[#D6D6D0] bg-white"
        }`}
      >
        {checked ? <Check className="h-3 w-3 text-saveful-green" /> : null}
      </span>
      <input type="radio" name={name} className="sr-only" checked={checked} onChange={onChange} />
      <span className="font-saveful text-sm text-gray-800">{label}</span>
    </label>
  );
}
