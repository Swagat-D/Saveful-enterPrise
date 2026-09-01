"use client";

import { BusinessGate } from "@/components/business/BusinessGate";
import { BusinessInsightsView } from "@/components/business/BusinessInsightsView";

export default function BusinessInsightsPage() {
  return (
    <BusinessGate>
      <BusinessInsightsView />
    </BusinessGate>
  );
}
