import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";

import { routing } from "@/i18n/routing";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Nav" });

  return {
    title: {
      default: "MossGap — Play browser games instantly",
      template: `%s · MossGap`,
    },
    description: t("search"),
    // 暗黑主题色
    other: {
      "color-scheme": "dark",
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
    <div className="relative flex min-h-screen flex-col neon-bg">
      {/* 全局背景：网格 + 径向光晕 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute inset-0 neon-grid opacity-[0.06]" />
        <div className="absolute inset-0 neon-radial" />
      </div>

      <SiteHeader />
      <main className="relative flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
