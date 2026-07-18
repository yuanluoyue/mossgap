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
export const fetchCache = "default-cache";

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
  // 并行拉取所有 i18n 文案，避免串行 await 拖长 TTFB
  const [t, tSeo, tFaq] = await Promise.all([
    getTranslations("Home"),
    getTranslations("Seo"),
    getTranslations({ locale, namespace: "Faq" }),
  ]);

  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  // 首页展示 10 个权重最高的游戏（权重高在前，同权重按创建时间倒序）
  const newest = await listGameCards(
    { page: 1, pageSize: 10, sort: "weight" },
    localeCode,
  );

  const hasGames = newest.items.length > 0;

  // FAQ 内容由服务端从 i18n 取出，传给客户端组件渲染（保证 HTML 包含问答文本，利于 SEO）
  const faqItems = (tFaq.raw("items") as FaqItem[]) ?? [];

  // LCP 元素预加载：首屏第一张有封面的卡片图。
  // 浏览器要等 HTML 解析到 <img> 才知道下载，提前用 <link rel="preload"> 让其并行下载，
  // 移动端可减少 100-300ms LCP。
  const lcpCoverImage = newest.items.find((g) => g.coverImage)?.coverImage;

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
      {/* LCP 图预加载：让浏览器在解析 HTML 之前就并行下载首屏第一张封面图 */}
      {lcpCoverImage ? (
        <link
          rel="preload"
          as="image"
          href={lcpCoverImage}
          fetchPriority="high"
        />
      ) : null}
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
      {/* 背景层：贴 <main> 底部、左右占满，不延伸到 footer。
          移动端不加载（首屏看不到，避免与 LCP 图争抢带宽），sm+ 才加载 bg.webp */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[60vh] bg-none bg-bottom bg-no-repeat sm:bg-cover sm:bg-[url('/bg.webp')]"
      />
      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ===== 最新游戏 ===== */}
        {newest.items.length > 0 ? (
          <section className="mb-10">
            <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 sm:[grid-template-columns:repeat(auto-fill,200px)] sm:justify-center">
              {newest.items.map((g, i) => (
                /* 移动端 grid-cols-2 首屏可见 2 张，仅前 2 张 eager 提升 LCP；其余 lazy */
                <GameCard key={g.id} game={g} size="compact" eager={i < 2} />
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
