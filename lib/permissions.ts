import type { SessionUser } from "@/lib/auth";

export function sitePermissions(user: SessionUser | null) {
  const admin = Boolean(user?.isHeadAdmin);
  return {
    view: true,
    edit: admin,
    manageAccess: admin,
    deactivate: admin,
    addSite: admin,
    bulkUpload: admin,
    export: true,
  };
}
