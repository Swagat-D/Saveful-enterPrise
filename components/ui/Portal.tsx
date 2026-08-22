"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "motion/react";
import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalStatAccent =
  | "green"
  | "amber"
  | "teal"
  | "orange"
  | "red"
  | "slate"
  | "purple";

const accentMap: Record<PortalStatAccent, string> = {
  green: "bg-saveful-green/10 text-saveful-green",
  amber: "bg-amber-50 text-amber-700",
  teal: "bg-teal-50 text-teal-700",
  orange: "bg-orange-50 text-orange-600",
  red: "bg-red-50 text-red-600",
  slate: "bg-slate-100 text-slate-600",
  purple: "bg-violet-50 text-violet-700",
};

export function PortalPageShell({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative h-full overflow-y-auto bg-[#F7F6F2] px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
      <div className={`relative z-10 mx-auto max-w-7xl space-y-5 sm:space-y-6 ${className}`}>
        {children}
      </div>
    </div>
  );
}

export function BrandMark({
  name,
  caption,
}: {
  name: string;
  caption?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <Image
          src="/notification_icon.png"
          alt="Saveful"
          fill
          className="object-contain p-1.5"
          sizes="44px"
        />
      </div>
      <div className="min-w-0">
        <p className="truncate font-saveful-semibold text-sm text-gray-900">{name}</p>
        {caption ? (
          <p className="truncate font-saveful text-xs text-gray-500">{caption}</p>
        ) : null}
      </div>
    </div>
  );
}

export function PortalPageHeader({
  eyebrow,
  brand,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  brand?: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-2.5">
        {eyebrow ? (
          <p className="font-saveful text-[11px] uppercase tracking-[0.2em] text-saveful-green">
            {eyebrow}
          </p>
        ) : null}
        {brand}
        <div>
          <h1 className="font-saveful-bold text-[1.75rem] leading-tight text-gray-900 sm:text-3xl lg:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-1.5 max-w-xl font-saveful text-sm leading-relaxed text-gray-600">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      {actions ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {actions}
        </div>
      ) : null}
    </div>
  );
}

export function PortalSectionLabel({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-3">
      <h2 className="font-saveful-bold text-sm text-gray-900">{title}</h2>
      {subtitle ? (
        <p className="mt-0.5 font-saveful text-xs text-gray-500">{subtitle}</p>
      ) : null}
    </div>
  );
}

export function PortalStatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent = "green",
  trend,
  href,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  accent?: PortalStatAccent;
  trend?: { value: number; label?: string };
  href?: string;
}) {
  const card = (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "h-full w-full rounded-2xl border border-black/[0.04] bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition",
        href && "hover:border-saveful-green/25 hover:shadow-md",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-saveful text-xs uppercase tracking-[0.14em] text-gray-500">
            {label}
          </p>
          <p className="mt-2 font-saveful-bold text-xl tabular-nums leading-none text-gray-900 sm:text-2xl">
            {value}
          </p>
          {trend ? (
            <p
              className={`mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-saveful text-[11px] ${
                trend.value >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
              }`}
            >
              {trend.value >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.value >= 0 ? "+" : ""}
              {trend.value}%
              {trend.label ? (
                <span className="hidden text-current/60 sm:inline"> {trend.label}</span>
              ) : null}
            </p>
          ) : hint ? (
            <p className="mt-1 truncate font-saveful text-xs text-gray-500">{hint}</p>
          ) : null}
        </div>
        <div className={`shrink-0 rounded-xl p-2.5 ${accentMap[accent]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </motion.div>
  );

  return href ? <Link href={href} className="block h-full">{card}</Link> : card;
}

export function PortalPanel({
  title,
  subtitle,
  children,
  action,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-2xl border border-black/[0.04] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5",
        className,
      )}
    >
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-saveful-bold text-base text-gray-900 sm:text-lg">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 font-saveful text-xs leading-relaxed text-gray-500">{subtitle}</p>
          ) : null}
        </div>
        {action ? <div className="shrink-0 self-start">{action}</div> : null}
      </div>
      {children}
    </motion.div>
  );
}

export function PortalChip({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full px-3 py-1.5 font-saveful text-xs transition",
        active
          ? "bg-saveful-green text-white"
          : "border border-gray-200 bg-white text-gray-700 hover:border-saveful-green/30",
      )}
    >
      {children}
    </button>
  );
}

export function StatusBadge({
  tone,
  children,
}: {
  tone: "green" | "amber" | "blue" | "red" | "slate";
  children: ReactNode;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    slate: "bg-gray-100 text-gray-600",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 font-saveful text-[11px] ${tones[tone]}`}>
      {children}
    </span>
  );
}
