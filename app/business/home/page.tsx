"use client";

import { BusinessGate } from "@/components/business/BusinessGate";
import { BusinessHomeMulti } from "@/components/business/BusinessHomeMulti";
import { BusinessHomeSingle } from "@/components/business/BusinessHomeSingle";
import { useBusinessSession } from "@/lib/businessAuth";

export default function BusinessHomePage() {
  return (
    <BusinessGate>
      <HomeInner />
    </BusinessGate>
  );
}

function HomeInner() {
  const user = useBusinessSession();
  if (!user) return null;
  if (user.role === "restaurant_multi") return <BusinessHomeMulti />;
  return <BusinessHomeSingle />;
}
