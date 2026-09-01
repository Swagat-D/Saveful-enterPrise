"use client";

import { useBusinessSession } from "@/lib/businessAuth";

export function BusinessGate({ children }: { children: React.ReactNode }) {
  const user = useBusinessSession();
  if (!user) return null;
  return <>{children}</>;
}
