"use client";

import { UserPlus } from "lucide-react";
import { AppPage } from "@/components/layout/AppPage";
import { Button } from "@/components/ui/button";
import { UsersDirectory } from "@/components/users/UsersDirectory";

export default function UsersPage() {
  return (
    <AppPage
      eyebrow="Access"
      title="Users"
      description="People who can manage the organisation, a site, or surplus listings."
      actions={
        <Button className="w-full sm:w-auto">
          <UserPlus className="h-4 w-4" />
          Invite user
        </Button>
      }
    >
      <UsersDirectory canInvite />
    </AppPage>
  );
}
