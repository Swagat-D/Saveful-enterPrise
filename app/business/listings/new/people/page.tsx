"use client";

import { BusinessGate } from "@/components/business/BusinessGate";
import { ListingCreateWizard } from "@/components/business/ListingCreateWizard";

export default function PeopleListingPage() {
  return (
    <BusinessGate>
      <ListingCreateWizard audience="people" />
    </BusinessGate>
  );
}
