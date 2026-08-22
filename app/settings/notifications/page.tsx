"use client";

import { useState } from "react";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { PortalPanel } from "@/components/ui/Portal";
import { cn } from "@/lib/utils";

export default function NotificationsSettingsPage() {
  const [notifyClaims, setNotifyClaims] = useState(true);
  const [notifyPickups, setNotifyPickups] = useState(true);
  const [notifyUsers, setNotifyUsers] = useState(true);
  const [notifyWeekly, setNotifyWeekly] = useState(false);

  return (
    <AppPage
      eyebrow="Enterprise Settings"
      title="Notifications"
      description="Organisation-wide prompts for surplus, access, and reports."
    >
      <PortalPanel title="Email and in-app alerts">
        <ToggleRow
          label="Claims and collections"
          description="When a charity or farmer claims surplus from any site"
          checked={notifyClaims}
          onChange={setNotifyClaims}
        />
        <ToggleRow
          label="Pickup updates"
          description="Reminders as pickup windows open and close"
          checked={notifyPickups}
          onChange={setNotifyPickups}
        />
        <ToggleRow
          label="User and access changes"
          description="Invites accepted, roles changed, and manager assignments"
          checked={notifyUsers}
          onChange={setNotifyUsers}
        />
        <ToggleRow
          label="Weekly impact digest"
          description="A Monday summary of food recovered across the organisation"
          checked={notifyWeekly}
          onChange={setNotifyWeekly}
        />
        <div className="pt-4">
          <Button>Save notifications</Button>
        </div>
      </PortalPanel>
    </AppPage>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 py-4 last:border-b-0">
      <div className="min-w-0">
        <p className="font-saveful-semibold text-sm text-gray-900">{label}</p>
        <p className="mt-0.5 font-saveful text-xs text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition",
          checked ? "bg-saveful-green" : "bg-gray-200",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
            checked ? "left-5" : "left-0.5",
          )}
        />
      </button>
    </div>
  );
}
