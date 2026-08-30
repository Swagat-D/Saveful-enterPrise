"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Building2, Check, Eye, EyeOff, Lock, MapPin, Shield } from "lucide-react";
import { acceptInvitation, ApiError, type InvitationPreview } from "@/lib/api";
import { cn } from "@/lib/utils";

const TERMS_HREF = "https://www.saveful.com/saveful-for-business-terms-conditions";
const PRIVACY_HREF = "https://www.saveful.com/privacy-policy";

function possessive(name: string) {
  const trimmed = name.trim();
  if (!trimmed) return "your";
  return /s$/i.test(trimmed) ? `${trimmed}'` : `${trimmed}'s`;
}

function passwordRules(password: string) {
  return [
    { id: "length", label: "At least 10 characters", ok: password.length >= 10 },
    { id: "upper", label: "1 uppercase letter", ok: /[A-Z]/.test(password) },
    { id: "number", label: "1 number", ok: /\d/.test(password) },
    { id: "special", label: "1 special character", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

function fieldClass(extra?: string) {
  return cn(
    "h-11 w-full rounded-lg border border-black/[0.08] bg-white px-3.5 font-saveful text-sm text-gray-900 outline-none",
    "placeholder:text-gray-400 focus:border-saveful-green/40 disabled:bg-[#F7F6F2] disabled:text-gray-600",
    extra,
  );
}

export function ActivateAccountScreen({
  token,
  preview,
  error: initialError,
}: {
  token: string;
  preview: InvitationPreview | null;
  error: string;
  alreadyActive?: boolean;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(initialError);
  const [done, setDone] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const signInHref = preview?.email
    ? `/login?portal=enterprise&activated=1&email=${encodeURIComponent(preview.email)}`
    : "/login?portal=enterprise&activated=1";

  const goToSignIn = () => router.replace(signInHref);

  useEffect(() => {
    if (!done) return;
    const timer = window.setTimeout(() => {
      router.replace(signInHref);
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [done, router, signInHref]);

  const rules = passwordRules(password);
  const passwordReady = rules.every((rule) => rule.ok);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!passwordReady) {
      setError("Please meet all password requirements.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (!acceptTerms) {
      setError("You must agree to the Terms & Conditions to activate your account.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await acceptInvitation(token, { password, acceptTerms: true });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not activate this account.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF7F0] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto w-full max-w-[720px]">
        {preview ? (
          <form onSubmit={onSubmit} className={cn(done && "pointer-events-none opacity-60")}>
            <h1 className="font-saveful-bold text-[28px] leading-tight text-saveful-green sm:text-[34px]">
              You&rsquo;ve been invited to Saveful for Business
            </h1>
            <p className="mt-3 font-saveful text-[15px] leading-relaxed text-gray-600">
              {preview.siteName ? (
                preview.invitedByName ? (
                  <>
                    You&rsquo;ve been invited by{" "}
                    <span className="font-saveful-semibold text-gray-900">{preview.invitedByName}</span> of{" "}
                    <span className="font-saveful-semibold text-gray-900">{possessive(preview.enterprise)}</span>{" "}
                    Enterprise Account to manage{" "}
                    <span className="font-saveful-semibold text-gray-900">{preview.siteName}</span>.
                  </>
                ) : (
                  <>
                    You&rsquo;ve been invited to manage{" "}
                    <span className="font-saveful-semibold text-gray-900">{preview.siteName}</span> for{" "}
                    <span className="font-saveful-semibold text-gray-900">{possessive(preview.enterprise)}</span>{" "}
                    Enterprise Account.
                  </>
                )
              ) : (
                <>
                  You&rsquo;ve been invited to manage{" "}
                  <span className="font-saveful-semibold text-gray-900">{possessive(preview.enterprise)}</span> Enterprise
                  account.
                </>
              )}
            </p>

            <div className="mt-6 grid grid-cols-1 overflow-hidden rounded-xl border border-black/[0.08] bg-white sm:grid-cols-2">
              {preview.siteName ? (
                <ContextCell icon={MapPin} label="Site" value={preview.siteName} />
              ) : (
                <ContextCell icon={Building2} label="Enterprise" value={preview.enterprise} />
              )}
              <ContextCell icon={Shield} label="Your role" value={preview.role} last />
            </div>

            {error ? (
              <p className="mt-5 rounded-lg border-l-4 border-red-500 bg-red-50 px-3 py-2.5 font-saveful text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <label className="mt-6 block">
              <span className="mb-1.5 block font-saveful text-sm text-gray-800">Email</span>
              <span className="relative block">
                <input id="activate-email" value={preview.email} disabled className={fieldClass("pr-3 sm:pr-56")} />
                <span className="mt-1.5 flex items-center gap-1.5 font-saveful text-xs text-gray-400 sm:absolute sm:right-3 sm:top-1/2 sm:mt-0 sm:-translate-y-1/2">
                  <Lock className="h-3.5 w-3.5" />
                  This email cannot be changed
                </span>
              </span>
            </label>

            <h2 className="mt-8 font-saveful-bold text-lg text-gray-900">Create your password</h2>

            <PasswordField
              id="activate-password"
              label="Password *"
              value={password}
              show={showPassword}
              onShow={() => setShowPassword((value) => !value)}
              onChange={setPassword}
            />

            <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
              {rules.map((rule) => (
                <li key={rule.id} className="flex items-center gap-1.5 font-saveful text-sm text-gray-600">
                  <span
                    className={cn(
                      "flex h-4 w-4 items-center justify-center rounded-full",
                      rule.ok ? "bg-emerald-500 text-white" : "bg-gray-200 text-transparent",
                    )}
                  >
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                  {rule.label}
                </li>
              ))}
            </ul>

            <PasswordField
              id="activate-confirm"
              label="Confirm password *"
              value={confirm}
              show={showConfirm}
              onShow={() => setShowConfirm((value) => !value)}
              onChange={setConfirm}
              className="mt-5"
            />

            <label className="mt-6 flex items-start gap-2.5 font-saveful text-sm text-gray-700">
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(event) => setAcceptTerms(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 text-saveful-green accent-saveful-green"
              />
              <span>
                I agree to the Saveful for Business{" "}
                <a href={TERMS_HREF} target="_blank" rel="noreferrer" className="font-saveful-semibold text-saveful-green underline">
                  Terms & Conditions
                </a>{" "}
                and{" "}
                <a href={PRIVACY_HREF} target="_blank" rel="noreferrer" className="font-saveful-semibold text-saveful-green underline">
                  Privacy Policy
                </a>
                .
              </span>
            </label>

            <button
              type="submit"
              disabled={saving || done}
              className="mt-6 h-12 w-full rounded-lg bg-saveful-green font-saveful-semibold text-white disabled:opacity-50"
            >
              {saving ? "Activating…" : "Activate Account"}
            </button>

            <SignInFooter />
          </form>
        ) : (
          <StatusBlock title="Invitation not valid" body={error} />
        )}
      </div>
      {done && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/40" />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="activation-success-title"
                className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-7"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
                  <Check className="h-5 w-5" strokeWidth={2.5} />
                </span>
                <h2 id="activation-success-title" className="mt-4 font-saveful-bold text-xl text-gray-900">
                  Account activated
                </h2>
                <p className="mt-2 font-saveful text-sm leading-relaxed text-gray-600">
                  You can now sign in to {preview?.siteName ?? preview?.enterprise ?? "your account"} with the password
                  you just created.
                </p>
                <button
                  type="button"
                  onClick={goToSignIn}
                  className="mt-6 h-11 w-full rounded-lg bg-saveful-green font-saveful-semibold text-sm text-white"
                >
                  Continue to sign in
                </button>
                <p className="mt-3 text-center font-saveful text-xs text-gray-400">Taking you to sign in…</p>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ContextCell({
  icon: Icon,
  label,
  value,
  last,
}: {
  icon: typeof Building2;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className={cn("flex items-start gap-3 px-4 py-4", !last && "border-b border-black/[0.08] sm:border-b-0 sm:border-r")}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <p className="font-saveful text-xs text-gray-500">{label}</p>
        <p className="mt-0.5 truncate font-saveful-semibold text-sm text-gray-900">{value}</p>
      </div>
    </div>
  );
}

function PasswordField({
  id,
  label,
  value,
  show,
  onShow,
  onChange,
  className,
}: {
  id: string;
  label: string;
  value: string;
  show: boolean;
  onShow: () => void;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={cn("mt-4 block", className)}>
      <span className="mb-1.5 block font-saveful text-sm text-gray-800">{label}</span>
      <span className="relative block">
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          required
          autoComplete="new-password"
          className={fieldClass("pr-16")}
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

function StatusBlock({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h1 className="font-saveful-bold text-[28px] leading-tight text-saveful-green sm:text-[34px]">{title}</h1>
      <p className="mt-3 font-saveful text-[15px] text-gray-600">{body}</p>
      <Link
        href="/login?portal=enterprise"
        className="mt-6 inline-flex h-12 w-full items-center justify-center rounded-lg bg-saveful-green font-saveful-semibold text-white"
      >
        Sign in
      </Link>
      <SignInFooter />
    </div>
  );
}

function SignInFooter() {
  return (
    <>
      <div className="mt-8 flex items-center gap-3">
        <span className="h-px flex-1 bg-black/[0.08]" />
        <span className="font-saveful text-sm text-gray-400">or</span>
        <span className="h-px flex-1 bg-black/[0.08]" />
      </div>
      <p className="mt-4 text-center font-saveful text-sm text-gray-600">
        Already activated your account?{" "}
        <Link href="/login?portal=enterprise" className="font-saveful-semibold text-saveful-green hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
