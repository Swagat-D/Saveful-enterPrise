"use client";

import { AppPage } from "@/components/layout/AppPage";

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
      <div className="space-y-3">
        {updates.map((update) => (
          <article key={update.title} className="rounded-3xl border border-white bg-white p-5 shadow-sm">
            <h2 className="font-saveful-bold text-lg text-gray-900">{update.title}</h2>
            <p className="mt-1 font-saveful text-sm text-gray-600">{update.body}</p>
          </article>
        ))}
      </div>
    </AppPage>
  );
}
