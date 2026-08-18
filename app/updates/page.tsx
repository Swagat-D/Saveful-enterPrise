"use client";

import { AppPage } from "@/components/layout/AppPage";
import { PortalPanel } from "@/components/ui/Portal";

const updates = [
  {
    title: "Surry Hills listing claimed",
    body: "A nearby charity claimed 18 kg of prepared meals. Pickup is tonight 9:00–10:00 pm.",
  },
  {
    title: "Parramatta Cafe needs a manager",
    body: "Assign access so this branch can list surplus without HQ doing it for them.",
  },
  {
    title: "HQ collection completed",
    body: "Evening bread and pastries were collected. Impact will appear in Insights.",
  },
];

export default function UpdatesPage() {
  return (
    <AppPage
      eyebrow="Activity"
      title="Updates"
      description="Claims, pickups, and site alerts across the organisation."
    >
      <PortalPanel title="Recent activity" subtitle="Same feed as restaurant Updates">
        <div className="space-y-3">
          {updates.map((update) => (
            <article
              key={update.title}
              className="rounded-2xl border border-gray-100 bg-[#FCFCFA] p-4"
            >
              <h2 className="font-saveful-bold text-base text-gray-900">{update.title}</h2>
              <p className="mt-1 font-saveful text-sm text-gray-600">{update.body}</p>
            </article>
          ))}
        </div>
      </PortalPanel>
    </AppPage>
  );
}
