"use client";

import { BusinessGate } from "@/components/business/BusinessGate";
import { ListingCreateWizard } from "@/components/business/ListingCreateWizard";

export default function FarmListingPage() {
  return (
    <BusinessGate>
      <ListingCreateWizard audience="farm" />
    </BusinessGate>
  );
}
