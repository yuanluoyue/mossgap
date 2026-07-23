import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { buildPageMetadata } from "@/lib/seo";
import { MissionsSection } from "../missions-section";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProfileNav" });
  return buildPageMetadata({
    title: t("missions"),
    description: t("missionsDesc"),
    path: "/profile/missions",
    locale,
    type: "profile",
  });
}

export default async function MissionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return <MissionsSection />;
}
