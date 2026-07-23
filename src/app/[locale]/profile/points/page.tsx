import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { buildPageMetadata } from "@/lib/seo";
import { getCurrentUserOrNull } from "@/lib/user-session";
import { PointsContent } from "./points-content";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProfileNav" });
  return buildPageMetadata({
    title: t("points"),
    description: t("pointsDesc"),
    path: "/profile/points",
    locale,
    type: "profile",
  });
}

export default async function PointsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);

  const user = await getCurrentUserOrNull();
  if (!user) return null;

  return <PointsContent user={user} />;
}
