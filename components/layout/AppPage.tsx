import { PortalShell } from "@/components/layout/PortalShell";
import { PageHeader } from "@/components/layout/PageHeader";

export function AppPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <PortalShell>
      <div className="relative h-full overflow-y-auto bg-[#F7F6F2] p-4 md:p-8">
        <div className="mx-auto max-w-6xl space-y-6">
          <PageHeader
            eyebrow={eyebrow}
            title={title}
            description={description}
            actions={actions}
          />
          {children}
        </div>
      </div>
    </PortalShell>
  );
}
