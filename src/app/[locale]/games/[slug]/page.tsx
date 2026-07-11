import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft } from "lucide-react";

import { GamePlayer } from "@/components/game-player";
import { GameToolbar } from "@/components/game-toolbar";
import { GameCard } from "@/components/game-card";
import {
  getPublicGameBySlug,
  listRelatedGames,
  hasLiked,
  hasDisliked,
  incrementPlayCount,
} from "@/db/queries";
import { getClientIp, getClientUserAgent } from "@/lib/api-guard";
import { hasServerEnv } from "@/env";
import { CATEGORY_COLORS } from "@/types";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

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

  return buildPageMetadata({
    title: t("gameDetailTitle", { title: game.title }),
    description:
      game.description || t("gameDetailDescription", { title: game.title }),
    path: `/games/${slug}`,
    locale,
    ogImage: game.coverImage || undefined,
    type: "article",
  });
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
  const game = enabled ? await getPublicGameBySlug(slug, localeCode) : null;
  if (enabled && !game) notFound();

  // 数据库未配置时显示占位
  if (!game) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="font-heading text-2xl text-foreground">{t("notFound")}</p>
        <p className="mt-2 text-sm text-muted-foreground">DATABASE_URL not configured.</p>
      </div>
    );
  }

  // 服务端并行：相关推荐 + 点赞/点踩初始状态 + 记录一次游玩
  const accent = CATEGORY_COLORS[game.category] ?? "#7c3aed";
  const [related, liked, disliked] = enabled
    ? await Promise.all([
        listRelatedGames(game.category, game.id, localeCode, [], 6),
        hasLiked(game.id, await getClientIp()),
        hasDisliked(game.id, await getClientIp()),
      ])
    : [[], false, false];

  // 浏览次数统计已暂时关闭（D1 免费写入次数有限）
  // if (enabled) {
  //   try {
  //     const [ip, ua] = await Promise.all([getClientIp(), getClientUserAgent()]);
  //     void incrementPlayCount(game.id, ip, ua);
  //   } catch {
  //     // 静默失败：play count 不应影响游玩
  //   }
  // }

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
  const videoGameJsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description || undefined,
    genre: game.category,
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
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Games",
        item: `${siteUrl}/games`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: game.title,
        item: gameUrl,
      },
    ],
  };

  return (
    <div className="relative">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(videoGameJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 返回 */}
        <Link
          href="/games"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          {t("back")}
        </Link>

        {/* 游戏播放器 + 工具栏：居中、固定尺寸 */}
        <div className="mt-4 flex flex-col items-center">
          <GamePlayer
            src={game.playUrl}
            title={game.title}
            loadingLabel={t("loading")}
          />
          <GameToolbar
            slug={game.slug}
            gameId={game.id}
            coverImage={game.coverImage}
            title={game.title}
            creator=""
            initialLiked={liked}
            initialLikeCount={game.likeCount}
            initialDisliked={disliked}
            initialDislikeCount={game.dislikeCount}
            accent={accent}
            feedbackLabels={feedbackLabels}
          />
        </div>

        {/* 游戏介绍 */}
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

        {/* 相关推荐 */}
        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {t("related")}
            </h2>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
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
