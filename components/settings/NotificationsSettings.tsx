"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Activity, FileText, Info, Users } from "lucide-react";
import { SettingsWorkspace } from "@/components/settings/SettingsWorkspace";
import { useSession } from "@/lib/auth";
import {
  RENOTIFY_AFTER_DAYS,
  THRESHOLD_DAYS,
  getNotificationSettings,
  useNotificationSettingsVersion,
  type NotificationSettings,
  type SiteAlertSetting,
  type ThresholdDays,
} from "@/lib/notificationSettings";
import { saveNotificationSettings } from "@/lib/notifications";
import { cn } from "@/lib/utils";

const selectClass =
  "h-9 rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-2.5 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40 disabled:cursor-not-allowed disabled:opacity-40";

export function NotificationsSettings() {
  return (
    <SettingsWorkspace
      title="Notifications"
      description="Choose which alerts are available across your Enterprise."
      actions={
        <div className="flex max-w-sm gap-2 rounded-xl bg-saveful-green/[0.06] px-3 py-2">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
          <p className="font-saveful text-[11px] leading-relaxed text-gray-600">
            Individual preferences: Users can choose which available notifications they personally receive from{" "}
            <Link href="/account" className="font-saveful-semibold text-saveful-green hover:underline">
              My Profile
            </Link>
            .
          </p>
        </div>
      }
    >
      <NotificationsSettingsForm />
    </SettingsWorkspace>
  );
}

function NotificationsSettingsForm() {
  useNotificationSettingsVersion();
  const user = useSession();
  const saved = getNotificationSettings();
  const [draft, setDraft] = useState<NotificationSettings>(saved);
  const [notice, setNotice] = useState("");

  const update = (next: NotificationSettings) => {
    setDraft(next);
    setNotice("");
  };

  const cancel = () => {
    setDraft(getNotificationSettings());
    setNotice("");
  };

  const save = () => {
    const result = saveNotificationSettings(draft, user?.name || "Enterprise user");
    setDraft(result.settings);
    setNotice(result.changes.length ? "Notification settings saved." : "No changes to save.");
  };

  return (
    <>
      <div className="space-y-4">
        <Card
          icon={<Activity className="h-4 w-4" />}
          title="Site activity alerts"
          hint="Help your team identify sites that may need attention."
        >
          <AlertRow
            label="No recent activity"
            description="Alert when a site has had no Saveful activity for:"
            setting={draft.noRecentActivity}
            onChange={(noRecentActivity) => update({ ...draft, noRecentActivity })}
          />
          <AlertRow
            label="Never activated"
            description="Alert when a new site has not activated within:"
            setting={draft.neverActivated}
            onChange={(neverActivated) => update({ ...draft, neverActivated })}
          />
          <AlertRow
            label="No listings"
            description="Alert when a site has created no listings for:"
            setting={draft.noListings}
            onChange={(noListings) => update({ ...draft, noListings })}
          />
        </Card>

        <Card
          icon={<FileText className="h-4 w-4" />}
          title="Report notifications"
          hint="Keep your team informed when Enterprise reporting is available."
        >
          <ToggleRow
            label="Report ready"
            description="Notify the user when a report they generated is ready."
            checked={draft.reportReady}
            onChange={(reportReady) => update({ ...draft, reportReady })}
          />
        </Card>

        <Card
          icon={<Users className="h-4 w-4" />}
          title="Account & access notifications"
          hint="Keep administrators informed of important access changes."
        >
          <ToggleRow
            label="New user activated"
            description="Notify when an invited Enterprise user activates their account."
            checked={draft.userActivated}
            onChange={(userActivated) => update({ ...draft, userActivated })}
          />
          <ToggleRow
            label="User access changed"
            description="Notify when a user's role or scope is changed."
            checked={draft.accessChanged}
            onChange={(accessChanged) => update({ ...draft, accessChanged })}
          />
        </Card>

        <p className="font-saveful text-xs text-gray-500">
          Alerts use the same site activity rules as Dashboard, Sites and Network Performance, and only go to users who
          can access that site. The same unresolved condition is not sent again for {RENOTIFY_AFTER_DAYS} days.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3">
        {notice ? <p className="mr-auto font-saveful text-xs text-saveful-green">{notice}</p> : null}
        <button
          type="button"
          onClick={cancel}
          className="inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3.5 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2]"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={save}
          className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
        >
          Save changes
        </button>
      </div>
    </>
  );
}

function Card({
  icon,
  title,
  hint,
  children,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-start gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2.5">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
          {icon}
        </span>
        <div>
          <h3 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h3>
          <p className="mt-0.5 font-saveful text-xs text-gray-500">{hint}</p>
        </div>
      </div>
      <div className="divide-y divide-gray-100 px-3.5">{children}</div>
    </section>
  );
}

function AlertRow({
  label,
  description,
  setting,
  onChange,
}: {
  label: string;
  description: string;
  setting: SiteAlertSetting;
  onChange: (next: SiteAlertSetting) => void;
}) {
  return (
    <div className="flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="font-saveful-semibold text-sm text-gray-900">{label}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <p className="font-saveful text-xs text-gray-500">{description}</p>
          <select
            value={setting.days}
            disabled={!setting.enabled}
            onChange={(event) => onChange({ ...setting, days: Number(event.target.value) as ThresholdDays })}
            className={selectClass}
          >
            {THRESHOLD_DAYS.map((days) => (
              <option key={days} value={days}>
                {days} days
              </option>
            ))}
          </select>
        </div>
      </div>
      <Toggle checked={setting.enabled} onChange={(enabled) => onChange({ ...setting, enabled })} />
    </div>
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
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <p className="font-saveful-semibold text-sm text-gray-900">{label}</p>
        <p className="mt-0.5 font-saveful text-xs text-gray-500">{description}</p>
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-saveful-green" : "bg-gray-200")}
    >
      <span
        className={cn(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition",
          checked ? "left-5" : "left-0.5",
        )}
      />
    </button>
  );
}
