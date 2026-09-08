"use client";

import { useState } from "react";
import { ChevronDown, Smartphone } from "lucide-react";
import { StoreBadges } from "@/components/business/StoreBadges";
import { cn } from "@/lib/utils";

export function SiteAdminPortalIntro() {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-saveful-green/20 bg-white">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left sm:px-5"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-saveful-green/10 text-saveful-green">
          <Smartphone className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-saveful-semibold text-sm text-gray-900">
            Download and use on your mobile device
          </span>
          <span className="mt-0.5 block truncate font-saveful text-xs text-gray-500">
            List surplus and add team members in the Saveful for Business app
          </span>
        </span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-gray-400 transition", open && "rotate-180")}
        />
      </button>
      {open ? (
        <div className="space-y-2 border-t border-black/[0.04] px-4 py-3 sm:px-5">
          <p className="font-saveful text-sm leading-relaxed text-gray-700">
            This is your online portal which you can view to see the Impact and Activities of your site.
          </p>
          <p className="font-saveful text-sm leading-relaxed text-gray-700">
            To list surplus items and add team members, please{" "}
            <span className="font-saveful-semibold text-gray-900">
              Download the Saveful for Business app on your mobile device.
            </span>
          </p>
          <p className="font-saveful text-sm leading-relaxed text-gray-700">
            All activity via the app will be registered on this online portal.
          </p>
          <div className="pt-1">
            <StoreBadges compact />
          </div>
        </div>
      ) : null}
    </section>
  );
}
