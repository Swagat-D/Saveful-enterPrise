"use client";

import { useState } from "react";
import { Upload } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { PortalPanel } from "@/components/ui/Portal";

const SAMPLE = `site_name,site_id,address,postcode,group,territory,cluster
Bondi Pavilion Cafe,BP-002,1 Queen Elizabeth Dr Bondi NSW,2026,Harbour Cafe,Eastern Suburbs,Bondi`;

export default function BulkUploadPage() {
  const [fileName, setFileName] = useState<string | null>(null);

  return (
    <AppPage
      eyebrow="Network"
      title="Bulk site upload"
      description="Import many sites at once with CSV or XLSX. Existing Site IDs are updated; new IDs are created."
      actions={
        <Button href="/sites" variant="secondary" className="w-full sm:w-auto">
          Back to sites
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <PortalPanel title="Upload file" subtitle="CSV or XLSX">
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-[#F7F6F2] px-4 py-10 text-center">
            <Upload className="h-5 w-5 text-saveful-green" />
            <p className="mt-3 font-saveful-semibold text-sm text-gray-900">
              {fileName ?? "Drop a file or browse"}
            </p>
            <p className="mt-1 font-saveful text-xs text-gray-500">site_name, site_id, address, group, territory, cluster</p>
            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(event) => setFileName(event.target.files?.[0]?.name ?? null)}
            />
          </label>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button className="w-full sm:w-auto" disabled={!fileName}>
              Import sites
            </Button>
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => {
                const blob = new Blob([SAMPLE], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = "saveful-sites-template.csv";
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              Download template
            </Button>
          </div>
        </PortalPanel>
        <PortalPanel title="How this works">
          <ul className="space-y-3 font-saveful text-sm leading-relaxed text-gray-600">
            <li>Group, territory and cluster are independent labels — a site can have any combination.</li>
            <li>Site ID is required so enterprise teams can keep their own codes.</li>
            <li>Imports only create or update sites in your authorised scope.</li>
            <li>Reassigning a site later does not rewrite historical recovery reporting.</li>
          </ul>
        </PortalPanel>
      </div>
    </AppPage>
  );
}
