import { redirect } from "next/navigation";

export default async function LegacyActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  redirect(token ? `/activate?token=${encodeURIComponent(token)}` : "/activate");
}
