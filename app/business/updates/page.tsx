"use client";

import { BusinessGate } from "@/components/business/BusinessGate";
import { BusinessUpdatesView } from "@/components/business/BusinessUpdatesView";

export default function BusinessUpdatesPage() {
  return (
    <BusinessGate>
      <BusinessUpdatesView />
    </BusinessGate>
  );
}
