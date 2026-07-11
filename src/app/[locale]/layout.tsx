import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getSiteUrl, getDefaultOgImage, SITE_NAME } from "@/lib/seo";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seo" });
  const siteUrl = await getSiteUrl();
  const ogImage = getDefaultOgImage(siteUrl);

  return {
    title: {
      default: t("homeTitle"),
      template: `%s · ${SITE_NAME}`,
    },
    description: t("siteDescription"),
    metadataBase: new URL(siteUrl),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: locale === "zh" ? "zh_CN" : "en_US",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: SITE_NAME,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [ogImage],
    },
    other: {
      "color-scheme": "light",
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // 启用静态渲染
  setRequestLocale(locale);

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="relative flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
