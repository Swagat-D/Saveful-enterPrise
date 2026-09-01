"use client";

import { BusinessGate } from "@/components/business/BusinessGate";
import { EnterpriseConsultForm } from "@/components/business/EnterpriseConsultForm";
import { PortalPageShell } from "@/components/ui/Portal";

export default function EnterpriseConsultPage() {
  return (
    <BusinessGate>
      <PortalPageShell className="!space-y-3">
        <div className="mx-auto w-full max-w-lg rounded-2xl border border-black/[0.05] bg-white p-5 sm:p-6">
          <EnterpriseConsultForm />
        </div>
      </PortalPageShell>
    </BusinessGate>
  );
}
