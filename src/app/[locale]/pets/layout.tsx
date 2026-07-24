import { setRequestLocale } from "next-intl/server";

import { getCurrentUserOrNull } from "@/lib/user-session";
import { PetsShell } from "./pets-shell";

export const dynamic = "force-dynamic";

export default async function PetsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);

  const user = await getCurrentUserOrNull();

  return <PetsShell user={user}>{children}</PetsShell>;
}
