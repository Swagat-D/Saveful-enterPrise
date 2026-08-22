"use client";

import { use, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form";
import { useSession } from "@/lib/auth";
import { demoSites } from "@/lib/demo";
import { demoClusters, demoGroups, demoTerritories } from "@/lib/network";
import { sitePermissions } from "@/lib/permissions";
import { scopeFromUser, siteInScope } from "@/lib/scope";

const creamInput =
  "h-11 w-full rounded-xl border-2 border-transparent bg-[#F5F1E8] px-4 font-saveful text-sm outline-none focus:border-[#A68FD9] focus:bg-white";

export default function EditSitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const user = useSession();
  const scope = scopeFromUser(user);
  const permissions = sitePermissions(user);
  const site = demoSites.find((item) => item.id === id && siteInScope(item, scope));
  const [name, setName] = useState(site?.name ?? "");
  const [siteCode, setSiteCode] = useState(site?.siteCode ?? "");
  const [groupId, setGroupId] = useState(site?.groupId ?? "all");
  const [territoryId, setTerritoryId] = useState(site?.territoryId ?? "all");
  const [clusterId, setClusterId] = useState(site?.clusterId ?? "all");

  if (!user) {
    return (
      <AppPage title="Edit site">
        <p className="font-saveful text-sm text-gray-500">Loading…</p>
      </AppPage>
    );
  }

  if (!site || !permissions.edit) {
    return (
      <AppPage title={!site ? "Site not found" : "You cannot edit this site"} description="This action is limited by your role and scope.">
        <Button href={site ? `/sites/${site.id}` : "/sites"} variant="secondary">Back</Button>
      </AppPage>
    );
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    router.push(`/sites/${site.id}`);
  };

  return (
    <AppPage
      eyebrow="Site"
      title={`Edit ${site.name}`}
      description="Changing group, territory or cluster does not rewrite historical recovery records."
      actions={
        <Button href={`/sites/${site.id}`} variant="secondary" className="w-full sm:w-auto">
          Cancel
        </Button>
      }
    >
      <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 rounded-2xl border border-black/[0.04] bg-white p-5">
        <FormField label="Site name">
          <input value={name} onChange={(event) => setName(event.target.value)} className={creamInput} />
        </FormField>
        <FormField label="Site ID" hint="Your internal site code. Used in search and exports.">
          <input value={siteCode} onChange={(event) => setSiteCode(event.target.value)} className={creamInput} />
        </FormField>
        <div className="grid gap-4 sm:grid-cols-3">
          <FormField label="Group">
            <select value={groupId} onChange={(event) => setGroupId(event.target.value)} className={creamInput}>
              <option value="all">Unassigned</option>
              {demoGroups.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Territory">
            <select value={territoryId} onChange={(event) => setTerritoryId(event.target.value)} className={creamInput}>
              <option value="all">Unassigned</option>
              {demoTerritories.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Cluster">
            <select value={clusterId} onChange={(event) => setClusterId(event.target.value)} className={creamInput}>
              <option value="all">Unassigned</option>
              {demoClusters.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </FormField>
        </div>
        <Button type="submit">Save site</Button>
      </form>
    </AppPage>
  );
}
