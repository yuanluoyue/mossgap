import { setRequestLocale } from "next-intl/server";

import { getCurrentUserOrNull } from "@/lib/user-session";
import { ProfileShell } from "./profile-shell";

export const dynamic = "force-dynamic";

export default async function ProfileLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);

  const user = await getCurrentUserOrNull();

  return <ProfileShell user={user}>{children}</ProfileShell>;
}
