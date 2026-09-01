"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BusinessGate } from "@/components/business/BusinessGate";
import { getEntitlements } from "@/lib/businessApi";

export default function BillingSuccessPage() {
  return (
    <BusinessGate>
      <SuccessInner />
    </BusinessGate>
  );
}

function SuccessInner() {
  const router = useRouter();
  const [message, setMessage] = useState("Confirming your organisation plan…");

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      attempts += 1;
      try {
        const entitlements = await getEntitlements();
        if (cancelled) return;
        if (entitlements.entitled) {
          router.replace("/business/home");
          return;
        }
      } catch {
        /* keep polling */
      }
      if (attempts >= 8) {
        setMessage("Your payment is processing. You can open Home — status updates in a moment.");
        return;
      }
      window.setTimeout(() => void poll(), 1500);
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div className="mx-auto max-w-md rounded-2xl bg-white p-6 text-center">
      <h1 className="font-saveful-bold text-2xl text-gray-900">You are all set</h1>
      <p className="mt-3 font-saveful text-sm text-gray-600">{message}</p>
      <Link href="/business/home" className="mt-6 inline-flex h-11 items-center rounded-xl bg-saveful-green px-5 font-saveful-semibold text-white">
        Go to Home
      </Link>
    </div>
  );
}
