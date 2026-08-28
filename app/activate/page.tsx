import { redirect } from "next/navigation";
import { ActivateAccountScreen } from "@/components/auth/ActivateAccountScreen";
import { ApiError, describeInvitation, type InvitationPreview } from "@/lib/api";

export const dynamic = "force-dynamic";

export type ActivationPageData = {
  token: string;
  preview: InvitationPreview | null;
  error: string;
  alreadyActive: boolean;
};

function alreadyActiveFrom(err: unknown) {
  if (err instanceof ApiError && err.code === "INVITATION_ALREADY_ACCEPTED") return true;
  const message = err instanceof Error ? err.message.toLowerCase() : "";
  return message.includes("already active") || message.includes("already been used");
}

export async function loadActivation(token?: string): Promise<ActivationPageData> {
  const next = token?.trim() ?? "";
  if (!next) {
    return {
      token: "",
      preview: null,
      error: "This activation link is missing its token. Open the link from your invitation email.",
      alreadyActive: false,
    };
  }

  try {
    const preview = await describeInvitation(next);
    return { token: next, preview, error: "", alreadyActive: false };
  } catch (err) {
    return {
      token: next,
      preview: null,
      error: err instanceof ApiError || err instanceof Error ? err.message : "This invitation is not valid.",
      alreadyActive: alreadyActiveFrom(err),
    };
  }
}

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const data = await loadActivation(token);
  if (data.alreadyActive) {
    redirect("/login?portal=enterprise&already=1");
  }
  return <ActivateAccountScreen {...data} />;
}
