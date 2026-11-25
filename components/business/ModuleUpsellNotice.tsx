"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import { MODULE_FALLBACK_COPY, MODULE_LABEL, MODULE_THEME } from "@/lib/businessPlanCopy";
import type { ProductModule } from "@/lib/businessTypes";

/**
 * Shown where an organisation's plan lacks a module (on the website: Saveful
 * Connect listings). The website sells plans, so admins get a link to them.
 */
export function ModuleUpsellNotice({
  module,
  canManage,
  className = "",
}: {
  module: ProductModule;
  canManage: boolean;
  className?: string;
}) {
  const theme = MODULE_THEME[module];
  const label = MODULE_LABEL[module];
  const copy = MODULE_FALLBACK_COPY[module];
  return (
    <div className={`rounded-2xl border p-4 sm:p-5 ${theme.tint} ${theme.border} ${className}`}>
      <div className="flex items-start gap-3">
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: theme.color }}
        >
          <Lock className="h-4 w-4" />
        </span>
        <div className="min-w-0 space-y-1.5">
          <p className={`font-saveful-bold text-sm ${theme.text}`}>{label} isn&apos;t in your plan</p>
          <p className="font-saveful text-sm text-gray-600">
            {copy.tagline} {copy.description}
          </p>
          <p className="font-saveful text-sm text-gray-600">
            {canManage
              ? `Add ${label} on its own, or choose Complete Solution for Make Food Count and Saveful Connect together.`
              : `Ask your organisation Super Admin to add ${label} to your plan.`}
          </p>
          {canManage ? (
            <Link
              href="/business/plans"
              className={`mt-1 inline-flex h-9 items-center rounded-lg px-4 font-saveful-semibold text-sm text-white ${theme.button}`}
            >
              Add {label}
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
