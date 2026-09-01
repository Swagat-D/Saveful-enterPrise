"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ApiError } from "@/lib/api";
import { resendBusinessVerification, verifyBusinessEmail } from "@/lib/businessApi";
import { completeBusinessSession } from "@/lib/businessAuth";
import { SavefulPageLoader } from "@/components/ui/SavefulPageLoader";

const fieldClass =
  "h-14 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] text-center font-saveful-bold text-2xl tracking-[0.4em] outline-none focus:border-saveful-green/40";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!email) {
      setError("Missing email. Start registration again.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const result = await verifyBusinessEmail(email, otp.trim());
      await completeBusinessSession(result.accessToken);
      router.replace("/business/plans");
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not verify this email.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-black/[0.05] bg-white p-6 shadow-sm sm:p-8">
      <h1 className="font-saveful-bold text-2xl text-gray-900">Verify your email</h1>
      <p className="mt-2 font-saveful text-sm text-gray-600">
        Enter the 6-digit code sent to <span className="font-saveful-semibold">{email || "your email"}</span>.
      </p>
      <input
        value={otp}
        onChange={(event) => setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
        inputMode="numeric"
        className={`${fieldClass} mt-6`}
        placeholder="000000"
      />
      {error ? <p className="mt-3 font-saveful text-sm text-amber-700">{error}</p> : null}
      {notice ? <p className="mt-3 font-saveful text-sm text-saveful-green">{notice}</p> : null}
      <button
        type="button"
        disabled={saving || otp.length < 6}
        onClick={() => void submit()}
        className="mt-6 h-11 w-full rounded-xl bg-saveful-green font-saveful-semibold text-white disabled:opacity-50"
      >
        {saving ? "Verifying…" : "Verify and continue"}
      </button>
      <button
        type="button"
        className="mt-3 w-full font-saveful text-sm text-saveful-green"
        onClick={async () => {
          if (!email) return;
          try {
            await resendBusinessVerification(email);
            setNotice("A new code is on its way.");
          } catch (err) {
            setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not resend.");
          }
        }}
      >
        Resend code
      </button>
    </div>
  );
}

export default function BusinessVerifyPage() {
  return (
    <Suspense fallback={<SavefulPageLoader message="Loading verification…" fullScreen={false} />}>
      <VerifyForm />
    </Suspense>
  );
}
