"use client";

import { useSyncExternalStore } from "react";
import { DEMO_TODAY } from "@/lib/dates";
import { demoAuditLog } from "@/lib/demo";

export type AuditEntry = {
  id: string;
  time: string;
  actor: string;
  action: string;
  detail: string;
};

const listeners = new Set<() => void>();
let version = 0;
let entries: AuditEntry[] = demoAuditLog.map((entry) => ({ ...entry }));

function emit() {
  version += 1;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useAuditVersion() {
  return useSyncExternalStore(subscribe, () => version, () => 0);
}

export function listAudit() {
  return entries;
}

export function appendAudit(entry: Omit<AuditEntry, "id" | "time"> & { time?: string }) {
  const time =
    entry.time ??
    DEMO_TODAY.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(",", " ·");
  entries = [{ id: `audit-${Date.now()}-${version}`, time, actor: entry.actor, action: entry.action, detail: entry.detail }, ...entries];
  emit();
}
