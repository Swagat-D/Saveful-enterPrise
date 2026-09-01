"use client";

import { useEffect, useState } from "react";
import { getEntitlements } from "@/lib/businessApi";
import type { Entitlements } from "@/lib/businessTypes";

export function useEntitlements() {
  const [entitlements, setEntitlements] = useState<Entitlements | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    try {
      const next = await getEntitlements();
      setEntitlements(next);
      return next;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return { entitlements, loading, refresh };
}
