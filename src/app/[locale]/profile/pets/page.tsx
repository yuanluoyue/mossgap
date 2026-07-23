import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { buildPageMetadata } from "@/lib/seo";
import { PetsSection } from "../pets-section";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProfileNav" });
  return buildPageMetadata({
    title: t("pets"),
    description: t("petsDesc"),
    path: "/profile/pets",
    locale,
    type: "profile",
  });
}

export default async function PetsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);

  return <PetsSection />;
}
