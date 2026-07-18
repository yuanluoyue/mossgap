import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { GamePlayerSection } from "@/components/game-player-section";
import { GameCard } from "@/components/game-card";
import {
  getPublicGameBySlug,
  getPublicGameContent,
  getPublicCategoryById,
  listRelatedGames,
  hasLiked,
} from "@/db/queries";
import { getClientIp } from "@/lib/api-guard";
import { hasServerEnv } from "@/env";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";
  const t = await getTranslations({ locale, namespace: "Seo" });

  const enabled = await hasServerEnv();
  const game = enabled ? await getPublicGameBySlug(slug, localeCode) : null;
  if (!game) {
    return buildPageMetadata({
      title: t("gamesTitle"),
      description: t("gamesDescription"),
      path: `/games/${slug}`,
      locale,
    });
  }

  // 拉取 locale 对应的攻略内容，用于 SEO 元信息
  let content = null;
  try {
    content = enabled ? await getPublicGameContent(game.id, localeCode) : null;
  } catch {
    content = null;
  }

  const seoTitle = content?.seoTitle || game.title;
  const seoDescription =
    content?.seoDescription ||
    content?.summary ||
    game.description ||
    t("gameDetailDescription", { title: game.title });
  const canonicalPath = content?.canonical || `/games/${slug}`;
  const keywords = content?.keywords || undefined;

  return buildPageMetadata({
    title: seoTitle,
    description: seoDescription,
    path: canonicalPath,
    locale,
    ogImage: game.coverImage || undefined,
    type: "article",
    ...(keywords ? { keywords } : {}),
  });
}

/** 判断富文本 HTML 是否实质为空（去除空标签/空白后无内容）。 */
function isEmptyHtml(html: string | null | undefined): boolean {
  if (!html) return true;
  // 去除所有标签和空白
  const text = html.replace(/<[^>]*>/g, "").replace(/\s+/g, "");
  return text.length === 0;
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  await setRequestLocale(locale);
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const t = await getTranslations("GameDetail");
  const tf = await getTranslations("Feedback");

  const enabled = await hasServerEnv();
  let game = null;
  try {
    game = enabled ? await getPublicGameBySlug(slug, localeCode) : null;
  } catch (err) {
    console.error("[GameDetail] getPublicGameBySlug error:", err);
    notFound();
  }
  if (!game) notFound();

  const clientIp = await getClientIp().catch(() => "0.0.0.0");
  const [related, liked, content, category] = await Promise.all([
    listRelatedGames(game.id, localeCode, 6).then(
      (r) => r,
      () => [] as Awaited<ReturnType<typeof listRelatedGames>>,
    ),
    hasLiked(game.id, clientIp).then(
      (v) => v,
      () => false,
    ),
    getPublicGameContent(game.id, localeCode).then(
      (c) => c,
      () => null,
    ),
    // 查关联分类：用于 accent 配色和 JSON-LD genre
    game.categoryId
      ? getPublicCategoryById(game.categoryId, localeCode).then(
          (c) => c,
          () => null,
        )
      : Promise.resolve(null),
  ]);
  const accent = category?.color || "#7c3aed";

  const feedbackLabels = {
    title: tf("gameTitle"),
    description: tf("gameDescription"),
    contentLabel: tf("contentLabel"),
    contentPlaceholder: tf("contentPlaceholder"),
    contactLabel: tf("contactLabel"),
    contactPlaceholder: tf("contactPlaceholder"),
    submit: tf("submit"),
    submitting: tf("submitting"),
    success: tf("success"),
    error: tf("error"),
  };

  const siteUrl = await getSiteUrl();
  const gameUrl = `${siteUrl}/games/${game.slug}`;
  // 优先用攻略摘要作为 VideoGame 描述（更长尾 SEO 友好）
  const videoGameDescription =
    content?.summary || game.description || undefined;
  const videoGameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: videoGameDescription,
    genre: category?.name || undefined,
    url: gameUrl,
    image: game.coverImage || undefined,
    playMode: "SinglePlayer",
    applicationCategory: "Game",
    operatingSystem: "Web Browser",
    datePublished: game.createdAt,
    aggregateRating:
      game.likeCount > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: game.likeCount,
            ratingCount: game.likeCount + game.dislikeCount,
          }
        : undefined,
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Games", item: `${siteUrl}/games` },
      { "@type": "ListItem", position: 3, name: game.title, item: gameUrl },
    ],
  };

  // FAQ 结构化数据（只有当 FAQ 有非空项时才生成）
  const faqItems =
    content?.faq?.filter(
      (item) => item.question.trim() && item.answer.trim(),
    ) ?? [];
  const faqJsonLd =
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

  const hasWalkthrough = !isEmptyHtml(content?.howToPlay);
  const hasTips = !isEmptyHtml(content?.tips);
  const hasControls = !isEmptyHtml(content?.controls);
  const hasFaq = faqItems.length > 0;

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(videoGameJsonLd).replace(/</g, "\\u003c") }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c") }}
      />
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd).replace(/</g, "\\u003c") }}
        />
      ) : null}
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          {t("back")}
        </Link>

        <GamePlayerSection
          src={game.playUrl}
          title={game.title}
          loadingLabel={t("loading")}
          toolbar={{
            slug: game.slug,
            gameId: game.id,
            coverImage: game.coverImage,
            title: game.title,
            creator: "",
            initialLiked: liked,
            initialLikeCount: game.likeCount,
            accent,
            feedbackLabels,
          }}
        />

        {game.description ? (
          <section className="mx-auto mt-10 max-w-[836px]">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("description")}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {game.description}
            </p>
          </section>
        ) : null}

        {/* 攻略 / 玩法说明（富文本，长尾 SEO 主战场） */}
        {hasWalkthrough ? (
          <section className="mx-auto mt-10 max-w-[836px]">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("walkthrough")}
            </h2>
            <div
              className="prose prose-sm mt-3 max-w-none text-foreground/80 [&_a]:text-primary [&_a]:underline [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-heading [&_h3]:text-base [&_h3]:font-semibold [&_img]:rounded-lg [&_img]:max-w-full [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: content!.howToPlay }}
            />
          </section>
        ) : null}

        {/* 技巧 */}
        {hasTips ? (
          <section className="mx-auto mt-10 max-w-[836px]">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("tips")}
            </h2>
            <div
              className="prose prose-sm mt-3 max-w-none text-foreground/80 [&_a]:text-primary [&_a]:underline [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-heading [&_h3]:text-base [&_h3]:font-semibold [&_img]:rounded-lg [&_img]:max-w-full [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: content!.tips }}
            />
          </section>
        ) : null}

        {/* 操作说明 */}
        {hasControls ? (
          <section className="mx-auto mt-10 max-w-[836px]">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("controls")}
            </h2>
            <div
              className="prose prose-sm mt-3 max-w-none text-foreground/80 [&_a]:text-primary [&_a]:underline [&_h2]:font-heading [&_h2]:text-lg [&_h2]:font-bold [&_h3]:font-heading [&_h3]:text-base [&_h3]:font-semibold [&_img]:rounded-lg [&_img]:max-w-full [&_li]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: content!.controls }}
            />
          </section>
        ) : null}

        {/* FAQ（零 JS 折叠面板 + FAQPage 结构化数据） */}
        {hasFaq ? (
          <section className="mx-auto mt-10 max-w-[836px]">
            <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              {t("faqTitle")}
            </h2>
            <div className="mt-3 space-y-2">
              {faqItems.map((item, i) => (
                <details
                  key={i}
                  className="group rounded-lg border border-border/60 bg-card"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:text-primary [&::-webkit-details-marker]:hidden">
                    <span>{item.question}</span>
                    <svg
                      className="size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </summary>
                  <div className="px-4 pb-3 text-sm leading-relaxed text-muted-foreground">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
          </section>
        ) : null}

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {t("related")}
            </h2>
            <div className="mt-5 grid grid-cols-4 gap-2 sm:gap-4 sm:[grid-template-columns:repeat(auto-fill,200px)] sm:justify-center">
              {related.map((g) => (
                <GameCard key={g.id} game={g} size="compact" />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
