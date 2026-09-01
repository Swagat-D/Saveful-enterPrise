"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { Bell, Building2, ChevronDown, LogOut, UserRound } from "lucide-react";
import { StoreBadges } from "@/components/business/StoreBadges";
import { useSession } from "@/lib/auth";
import { listInbox, useNotificationInboxVersion } from "@/lib/notifications";
import { profileFromSession } from "@/lib/profile";
import { cn } from "@/lib/utils";

export function AppHeader({
  userName,
  userEmail,
  roleLabel,
  organization = "",
  organizationLogo,
  portalCaption = "Enterprise",
  profileHref = "/account",
  onLogout,
  compact = false,
  showAppDownload = false,
}: {
  userName: string;
  userEmail: string;
  roleLabel: string;
  organization?: string;
  organizationLogo?: string | null;
  portalCaption?: string;
  profileHref?: string;
  onLogout?: () => void;
  compact?: boolean;
  showAppDownload?: boolean;
}) {
  const initials = userName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <header
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-black/[0.04] bg-white/90 px-4 backdrop-blur-sm sm:px-6",
        compact ? "min-h-14 py-2" : "min-h-16 py-2",
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        {organizationLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={organizationLogo}
            alt=""
            className="h-9 w-9 shrink-0 rounded-xl object-cover ring-1 ring-black/5"
          />
        ) : (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 text-saveful-green">
            <Building2 className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-saveful-semibold text-sm text-gray-900">{organization}</p>
          <p className="hidden truncate font-saveful text-[11px] text-gray-500 sm:block">
            {portalCaption}
          </p>
        </div>
      </div>

      {showAppDownload ? (
        <div className="order-3 flex w-full min-w-0 items-center justify-center gap-2 md:order-none md:w-auto md:flex-1">
          <p className="hidden font-saveful text-xs text-gray-500 sm:block">
            Download the app for a better experience
          </p>
          <StoreBadges compact />
        </div>
      ) : null}

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {portalCaption !== "Admin" && portalCaption !== "Business" ? <NotificationsMenu /> : null}
        <UserMenu
          initials={initials}
          userName={userName}
          userEmail={userEmail}
          roleLabel={roleLabel}
          profileHref={profileHref}
          onLogout={onLogout}
        />
      </div>
    </header>
  );
}

function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useNotificationInboxVersion();
  const user = useSession();
  const items = user ? listInbox(user, profileFromSession(user).notifications) : [];

  useDismiss(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="relative rounded-full p-2 text-gray-600 transition hover:bg-[#F7F6F2] hover:text-saveful-green"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {items.length ? (
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
        ) : null}
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <p className="font-saveful-semibold text-sm text-gray-900">Notifications</p>
            <Link
              href={items.some((item) => item.siteId) ? "/sites?attention=all" : "/account"}
              onClick={() => setOpen(false)}
              className="font-saveful text-xs text-saveful-green hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length ? (
              items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block border-b border-gray-50 px-4 py-3 last:border-0 hover:bg-[#FAF7F0]"
                >
                  <p className="font-saveful-semibold text-sm text-gray-900">{item.title}</p>
                  <p className="mt-0.5 font-saveful text-xs text-gray-500">{item.detail}</p>
                  <p className="mt-0.5 font-saveful text-[11px] text-gray-400">{item.time}</p>
                </Link>
              ))
            ) : (
              <p className="px-4 py-6 font-saveful text-sm text-gray-500">No notifications in your scope.</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function UserMenu({
  initials,
  userName,
  userEmail,
  roleLabel,
  profileHref,
  onLogout,
}: {
  initials: string;
  userName: string;
  userEmail: string;
  roleLabel: string;
  profileHref: string;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, () => setOpen(false));

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full py-1 pl-1 pr-1.5 transition hover:bg-[#F7F6F2] sm:pr-2.5"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-saveful-green font-saveful-bold text-sm text-white">
          {initials || "U"}
        </span>
        <span className="hidden min-w-0 text-left sm:block">
          <span className="block truncate font-saveful-semibold text-sm text-gray-900">{userName}</span>
          <span className="block truncate font-saveful text-[11px] text-gray-500">{roleLabel}</span>
        </span>
        <ChevronDown className={cn("hidden h-4 w-4 text-gray-400 transition sm:block", open && "rotate-180")} />
      </button>
      {open ? (
        <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl border border-black/[0.06] bg-white py-1 shadow-[0_12px_40px_rgba(16,24,40,0.12)]">
          <div className="border-b border-gray-100 px-3 py-2.5">
            <p className="truncate font-saveful-semibold text-sm text-gray-900">{userName}</p>
            <p className="truncate font-saveful text-xs text-gray-500">{userEmail}</p>
            <p className="mt-0.5 font-saveful text-[11px] text-gray-400">{roleLabel}</p>
          </div>
          <Link
            href={profileHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 font-saveful text-sm text-saveful-green hover:bg-[#FAF7F0]"
          >
            <UserRound className="h-4 w-4" />
            My Profile
          </Link>
          {onLogout ? (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onLogout();
              }}
              className="flex w-full items-center gap-2 border-t border-gray-100 px-3 py-2.5 text-left font-saveful text-sm text-red-600 hover:bg-red-50"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function useDismiss(ref: RefObject<HTMLDivElement | null>, onDismiss: () => void) {
  useEffect(() => {
    const handle = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onDismiss();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [onDismiss, ref]);
}
