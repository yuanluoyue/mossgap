import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { Gamepad2 } from "lucide-react";

import { Faq, type FaqItem } from "@/components/faq";
import { GameCard } from "@/components/game-card";
import { listGameCards } from "@/db/queries";

import { buildPageMetadata, getSiteUrl, SITE_NAME } from "@/lib/seo";

export const revalidate = 0;
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seo" });
  return buildPageMetadata({
    title: t("homeTitle"),
    description: t("homeDescription"),
    path: "/",
    locale,
  });
}

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);
  const t = await getTranslations("Home");
  const tSeo = await getTranslations("Seo");
  const tFaq = await getTranslations({ locale, namespace: "Faq" });

  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const newest = await listGameCards(
    { page: 1, pageSize: 8, sort: "newest" },
    localeCode,
  );

  const hasGames = newest.items.length > 0;

  // FAQ 内容由服务端从 i18n 取出，传给客户端组件渲染（保证 HTML 包含问答文本，利于 SEO）
  const faqItems = (tFaq.raw("items") as FaqItem[]) ?? [];

  const siteUrl = await getSiteUrl();
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: siteUrl,
    description: tSeo("homeDescription"),
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/games?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: siteUrl,
    logo: `${siteUrl}/logo.png`,
    sameAs: [],
  };
  // FAQPage 结构化数据：让 Google 在搜索结果中直接展示问答，提升点击率
  const faqPageJsonLd =
    faqItems.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqItems.map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
        }
      : null;

  return (
    <>
      {/* 预加载首屏关键资源：bg.webp 是 CSS background-image，预加载扫描器发现不了 */}
      <link rel="preload" as="image" href="/bg.webp" fetchPriority="high" />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(organizationJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {faqPageJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqPageJsonLd).replace(/</g, "\\u003c"),
          }}
        />
      ) : null}
      {/* 背景层：贴 <main> 底部、左右占满，不延伸到 footer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[60vh] bg-cover bg-bottom bg-no-repeat"
        style={{ backgroundImage: "url('/bg.webp')" }}
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ===== 最新游戏 ===== */}
        {newest.items.length > 0 ? (
          <section className="mb-10">
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:[grid-template-columns:repeat(auto-fill,200px)] sm:justify-center">
              {newest.items.map((g, i) => (
                /* 首屏可见卡片（前 4 张）用 eager 提升 LCP；其余 lazy */
                <GameCard key={g.id} game={g} size="compact" eager={i < 4} />
              ))}
            </div>
          </section>
        ) : null}

        {/* 空状态 */}
        {!hasGames ? (
          <section className="py-20">
            <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
                <Gamepad2 className="size-7 text-primary" />
              </div>
              <p className="font-heading text-lg text-foreground">
                {t("emptyTitle")}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t("emptySubtitle")}
              </p>
            </div>
          </section>
        ) : null}
      </div>

      {/* ===== FAQ ===== */}
      <Faq
        title={tFaq("title")}
        subtitle={tFaq("subtitle")}
        items={faqItems}
      />
    </>
  );
}
