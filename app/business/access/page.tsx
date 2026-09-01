"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { BusinessGate } from "@/components/business/BusinessGate";
import { PortalPageHeader, PortalPageShell } from "@/components/ui/Portal";
import { ApiError } from "@/lib/api";
import {
  getBusinessOrganisation,
  inviteSiteManager,
  listSitePeople,
} from "@/lib/businessApi";
import { useBusinessSession } from "@/lib/businessAuth";
import { useEntitlements } from "@/lib/businessBilling";
import { ensureDefaultHqSite, isBusinessMultiHeadOffice, isVirtualHqSiteId } from "@/lib/businessHqSite";

const fieldClass =
  "h-11 w-full rounded-xl border border-black/[0.06] bg-[#F7F6F2] px-3 font-saveful text-sm outline-none focus:border-saveful-green/40";

type Person = { userId: number; user?: { firstName?: string; lastName?: string; email?: string } };

export default function BusinessAccessPage() {
  return (
    <BusinessGate>
      <AccessInner />
    </BusinessGate>
  );
}

function AccessInner() {
  const user = useBusinessSession();
  const { entitlements } = useEntitlements();
  const [sites, setSites] = useState<Array<{ id: number; siteName: string }>>([]);
  const [siteId, setSiteId] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const needsPlan = Boolean(entitlements?.billingRequired && !entitlements.entitled);

  const loadSites = async () => {
    const payload = await getBusinessOrganisation();
    let next = (payload.sites ?? []).filter((site) => !isVirtualHqSiteId(site.id));
    if (next.length === 0 && user && isBusinessMultiHeadOffice(user)) {
      next = (await ensureDefaultHqSite(user)).filter((site) => !isVirtualHqSiteId(site.id));
    }
    setSites(next.map((site) => ({ id: site.id, siteName: site.siteName })));
    if (!siteId && next[0]) setSiteId(String(next[0].id));
  };

  useEffect(() => {
    if (!user) return;
    void loadSites().catch(() => undefined);
  }, [user]);

  useEffect(() => {
    if (!siteId) return;
    void listSitePeople(Number(siteId))
      .then((detail) => setPeople([...(detail.managers ?? []), ...(detail.staff ?? [])]))
      .catch(() => setPeople([]));
  }, [siteId]);

  const invite = async (event: FormEvent) => {
    event.preventDefault();
    if (needsPlan) return;
    setError("");
    setNotice("");
    try {
      await inviteSiteManager(Number(siteId), { firstName, lastName, email, password });
      setNotice("Authorised user added. They sign in with this email — they never buy.");
      setFirstName("");
      setLastName("");
      setEmail("");
      setPassword("");
      const detail = await listSitePeople(Number(siteId));
      setPeople([...(detail.managers ?? []), ...(detail.staff ?? [])]);
    } catch (err) {
      setError(err instanceof ApiError || err instanceof Error ? err.message : "Could not add this person.");
    }
  };

  return (
    <PortalPageShell>
      <PortalPageHeader
        eyebrow="Organisation"
        title="Sites & access"
        description="Add sites and authorised users. They only log in — they never buy."
      />
      {needsPlan ? (
        <p className="rounded-xl bg-amber-50 px-4 py-3 font-saveful text-sm text-amber-800">
          Extra staff and sites stay locked until the organisation is on a trial or plan.
        </p>
      ) : null}

      {user?.role === "restaurant_multi" ? (
        <div className="rounded-2xl bg-white p-5">
          <h2 className="font-saveful-bold text-lg">Add location</h2>
          <p className="mt-1 font-saveful text-sm text-gray-500">
            Same flow as the app: create the site, then assign a manager.
          </p>
          <Link
            href={needsPlan ? "/business/plans" : "/business/locations/new"}
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-saveful-green px-4 font-saveful-semibold text-white"
          >
            Add location & manager
          </Link>
        </div>
      ) : null}

      <section className="rounded-2xl bg-white p-5">
        <h2 className="font-saveful-bold text-lg">Authorised users</h2>
        <label className="mt-3 block">
          <span className="mb-1.5 block font-saveful text-sm">Site</span>
          <select value={siteId} onChange={(event) => setSiteId(event.target.value)} className={fieldClass}>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.siteName}
              </option>
            ))}
          </select>
        </label>
        <div className="mt-4 space-y-2">
          {people.map((person) => (
            <p key={person.userId} className="font-saveful text-sm text-gray-700">
              {person.user?.firstName} {person.user?.lastName} · {person.user?.email}
            </p>
          ))}
          {people.length === 0 ? <p className="font-saveful text-sm text-gray-500">No other users on this site yet.</p> : null}
        </div>
      </section>

      <form onSubmit={invite} className="space-y-3 rounded-2xl bg-white p-5">
        <h2 className="font-saveful-bold text-lg">Add authorised user</h2>
        <p className="font-saveful text-sm text-gray-500">They only log in. They never buy.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={firstName} onChange={(event) => setFirstName(event.target.value)} required placeholder="First name" className={fieldClass} />
          <input value={lastName} onChange={(event) => setLastName(event.target.value)} required placeholder="Last name" className={fieldClass} />
        </div>
        <input value={email} onChange={(event) => setEmail(event.target.value)} required type="email" placeholder="Email" className={fieldClass} />
        <input value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} type="password" placeholder="Temporary password" className={fieldClass} />
        {error ? <p className="font-saveful text-sm text-amber-700">{error}</p> : null}
        {notice ? <p className="font-saveful text-sm text-saveful-green">{notice}</p> : null}
        <button disabled={needsPlan || !siteId} className="h-11 rounded-xl bg-saveful-green px-4 font-saveful-semibold text-white disabled:opacity-50">
          Add user
        </button>
      </form>
    </PortalPageShell>
  );
}
