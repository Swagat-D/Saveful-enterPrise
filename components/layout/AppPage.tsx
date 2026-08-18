"use client";

import { PortalShell } from "@/components/layout/PortalShell";
import {
  PortalPageHeader,
  PortalPageShell,
} from "@/components/ui/Portal";

export function AppPage({
  eyebrow,
  brand,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  brand?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <PortalShell>
      <PortalPageShell>
        <PortalPageHeader
          eyebrow={eyebrow}
          brand={brand}
          title={title}
          description={description}
          actions={actions}
        />
        {children}
      </PortalPageShell>
    </PortalShell>
  );
}
