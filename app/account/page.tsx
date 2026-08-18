"use client";

import { AppPage } from "@/components/layout/AppPage";
import { useSession } from "@/lib/auth";

export default function AccountPage() {
  const user = useSession();

  return (
    <AppPage
      eyebrow="Profile"
      title="Account"
      description="Organisation details, head-office contact, and notification preferences."
    >
      <section className="max-w-xl space-y-4 rounded-3xl border border-white bg-white p-6 shadow-sm">
        <div>
          <p className="font-saveful text-xs uppercase tracking-wide text-gray-500">Name</p>
          <p className="mt-1 font-saveful-semibold text-gray-900">{user?.name || "Head admin"}</p>
        </div>
        <div>
          <p className="font-saveful text-xs uppercase tracking-wide text-gray-500">Business</p>
          <p className="mt-1 font-saveful-semibold text-gray-900">{user?.organization || "Your business"}</p>
        </div>
        <div>
          <p className="font-saveful text-xs uppercase tracking-wide text-gray-500">Email</p>
          <p className="mt-1 font-saveful-semibold text-gray-900">{user?.email || "—"}</p>
        </div>
        <div>
          <p className="font-saveful text-xs uppercase tracking-wide text-gray-500">Role</p>
          <p className="mt-1 font-saveful-semibold text-gray-900">Restaurant multi-site · Head admin</p>
        </div>
      </section>
    </AppPage>
  );
}
