"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Info, Lock, Shield, UserRound } from "lucide-react";
import { PortalPageShell } from "@/components/ui/Portal";
import { PortalShell } from "@/components/layout/PortalShell";
import { updateSession, useSession } from "@/lib/auth";
import { getOrganization, useOrganizationVersion } from "@/lib/organization";
import { availablePersonalNotifications } from "@/lib/notifications";
import { useNotificationSettingsVersion } from "@/lib/notificationSettings";
import {
  accessFromSession,
  changePassword,
  profileFromSession,
  savePersonalProfile,
  type PersonalNotifications,
} from "@/lib/profile";
import { cn } from "@/lib/utils";

const inputClass =
  "h-9 w-full rounded-lg border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm text-gray-800 outline-none focus:border-saveful-green/40 focus:bg-white";

export function ProfileWorkspace() {
  return (
    <PortalShell>
      <ProfileBody />
    </PortalShell>
  );
}

function ProfileBody() {
  const user = useSession();
  useOrganizationVersion();
  useNotificationSettingsVersion();
  const organization = getOrganization();
  const personalAlerts = availablePersonalNotifications();
  const access = user ? accessFromSession(user) : null;
  const initial = user ? profileFromSession(user) : null;
  const [firstName, setFirstName] = useState(initial?.firstName ?? "");
  const [lastName, setLastName] = useState(initial?.lastName ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [notifications, setNotifications] = useState<PersonalNotifications>(
    initial?.notifications ?? { accountAccess: true, reports: true, siteAttention: true },
  );
  const [saved, setSaved] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [nextPassword, setNextPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNextPassword, setShowNextPassword] = useState(false);

  if (!user || !access) return null;

  const persistProfile = (next = { firstName, lastName, email, mobile, notifications }) => {
    savePersonalProfile(next);
    updateSession({
      name: `${next.firstName} ${next.lastName}`.trim() || user.name,
      email: next.email.trim() || user.email,
    });
  };

  const saveDetails = () => {
    persistProfile();
    setSaved("Personal details saved.");
  };

  const saveNotifications = (next: PersonalNotifications) => {
    setNotifications(next);
    persistProfile({ firstName, lastName, email, mobile, notifications: next });
  };

  const submitPassword = async () => {
    const problem = changePassword(currentPassword, nextPassword, confirmPassword);
    if (problem) {
      setPasswordError(problem);
      setPasswordNotice("");
      return;
    }
    setChangingPassword(true);
    setPasswordError("");
    await new Promise((resolve) => window.setTimeout(resolve, 400));
    setCurrentPassword("");
    setNextPassword("");
    setConfirmPassword("");
    setPasswordNotice("Password updated. Use it the next time you sign in.");
    setChangingPassword(false);
  };

  return (
    <PortalPageShell className="!space-y-3 sm:!space-y-3">
        <nav className="font-saveful text-xs text-gray-500">
          <span className="text-gray-700">My Profile</span>
        </nav>

        <section className="overflow-hidden rounded-2xl border border-black/[0.05] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
          <header className="border-b border-gray-100 px-4 py-3.5 sm:px-5">
            <h1 className="font-saveful-bold text-xl text-gray-900 sm:text-2xl">My Profile</h1>
            <p className="mt-1.5 font-saveful text-xs text-gray-500">
              Manage your personal details and account settings.
            </p>
          </header>

          <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-2">
            <Card
              icon={<UserRound className="h-4 w-4" />}
              title="Personal details"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="First name">
                  <input value={firstName} onChange={(event) => setFirstName(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Last name">
                  <input value={lastName} onChange={(event) => setLastName(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Email" className="sm:col-span-2">
                  <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Mobile" className="sm:col-span-2">
                  <input value={mobile} onChange={(event) => setMobile(event.target.value)} className={inputClass} />
                </Field>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={saveDetails}
                  className="inline-flex h-9 items-center rounded-lg bg-saveful-green px-3.5 font-saveful-semibold text-sm text-white"
                >
                  Save changes
                </button>
                {saved ? <p className="font-saveful text-xs text-saveful-green">{saved}</p> : null}
              </div>
            </Card>

            <Card
              icon={<Shield className="h-4 w-4" />}
              title="Role & access"
            >
              <p className="font-saveful text-xs text-gray-500">
                Your current access within {organization.name}.
              </p>
              <dl className="mt-3 divide-y divide-gray-100">
                <ReadOnly label="Role" value={access.roleName} />
                <ReadOnly label="Scope" value={access.scopeLabel} />
              </dl>
              <div className="mt-4 flex gap-2 rounded-xl bg-saveful-green/[0.06] px-3 py-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-saveful-green" />
                <p className="font-saveful text-xs leading-relaxed text-gray-600">
                  Your role and access are managed by your Enterprise. Only an authorised administrator can change them.
                  {access.roleDetail ? ` ${access.roleDetail}` : ""}
                </p>
              </div>
            </Card>

            <Card
              icon={<Lock className="h-4 w-4" />}
              title="Security"
            >
              <p className="font-saveful text-xs text-gray-500">
                Change your password using the same checks as sign-in: current password, then a new password and confirmation.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3">
                <Field label="Current password">
                  <PasswordInput
                    value={currentPassword}
                    onChange={setCurrentPassword}
                    autoComplete="current-password"
                    visible={showCurrentPassword}
                    onToggle={() => setShowCurrentPassword((value) => !value)}
                  />
                </Field>
                <Field label="New password">
                  <PasswordInput
                    value={nextPassword}
                    onChange={setNextPassword}
                    autoComplete="new-password"
                    visible={showNextPassword}
                    onToggle={() => setShowNextPassword((value) => !value)}
                  />
                </Field>
                <Field label="Confirm new password">
                  <input
                    type={showNextPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                    className={inputClass}
                  />
                </Field>
              </div>
              {passwordError ? <p className="mt-2 font-saveful text-xs text-red-600">{passwordError}</p> : null}
              {passwordNotice ? <p className="mt-2 font-saveful text-xs text-saveful-green">{passwordNotice}</p> : null}
              <button
                type="button"
                onClick={() => void submitPassword()}
                disabled={changingPassword}
                className="mt-3 inline-flex h-9 items-center rounded-lg border border-black/[0.06] px-3 font-saveful-semibold text-sm text-gray-800 hover:bg-[#F7F6F2] disabled:opacity-40"
              >
                {changingPassword ? "Updating…" : "Change password"}
              </button>
            </Card>

            <Card
              icon={<Bell className="h-4 w-4" />}
              title="Notifications"
            >
              <p className="font-saveful text-xs text-gray-500">
                Choose which available Enterprise notifications you’d like to receive. Which alerts exist is set in
                Enterprise Settings.
              </p>
              <div className="mt-3 space-y-3">
                {personalAlerts.length ? (
                  personalAlerts.map((item) => (
                    <label key={item.id} className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={notifications[item.id]}
                        onChange={(event) =>
                          saveNotifications({ ...notifications, [item.id]: event.target.checked })
                        }
                        className="mt-0.5 accent-saveful-green"
                      />
                      <span>
                        <span className="block font-saveful-semibold text-sm text-gray-900">{item.label}</span>
                        <span className="block font-saveful text-xs text-gray-500">{item.hint}</span>
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="font-saveful text-xs text-gray-500">
                    Your Enterprise has not enabled any personal notifications.
                  </p>
                )}
              </div>
            </Card>
          </div>

          <p className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 font-saveful text-[11px] text-gray-400 sm:px-5">
            <Lock className="h-3.5 w-3.5" />
            Your personal information is secure and will only be used in accordance with our{" "}
            <Link href="https://www.saveful.com/privacy-policy" target="_blank" className="text-saveful-green hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        </section>
    </PortalPageShell>
  );
}

function Card({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center gap-2 border-b border-gray-100 bg-[#F7F6F2] px-3.5 py-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-saveful-green/10 text-saveful-green">
          {icon}
        </span>
        <h2 className="font-saveful-semibold text-xs uppercase tracking-[0.14em] text-gray-700">{title}</h2>
      </div>
      <div className="p-3.5">{children}</div>
    </section>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("block min-w-0", className)}>
      <span className="mb-1.5 block font-saveful text-[11px] uppercase tracking-[0.14em] text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
  visible,
  onToggle,
}: {
  value: string;
  onChange: (value: string) => void;
  autoComplete: string;
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className={cn(inputClass, "pr-14")}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-3 font-saveful text-xs text-gray-500 hover:text-saveful-green"
      >
        {visible ? "Hide" : "Show"}
      </button>
    </div>
  );
}

function ReadOnly({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-3 py-2.5">
      <dt className="font-saveful text-xs text-gray-500">{label}</dt>
      <dd className="font-saveful-semibold text-sm text-gray-900">{value}</dd>
    </div>
  );
}
