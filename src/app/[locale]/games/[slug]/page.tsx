import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Eye, Calendar, Gamepad2 } from "lucide-react";
import type { Metadata } from "next";
import { headers } from "next/headers";

import { GameCard } from "@/components/game-card";
import { GamePlayer } from "@/components/game-player";
import { GameToolbar } from "@/components/game-toolbar";
import { getPublicGameBySlug, listRelatedGames, hasLiked, hasDisliked } from "@/db/queries";
import { hasServerEnv } from "@/env";
import { CATEGORY_COLORS } from "@/types";
import type { GameCategory } from "@/types";

const CATEGORY_EMOJI: Record<GameCategory, string> = {
  action: "⚔️",
  puzzle: "🧩",
  arcade: "👾",
  adventure: "🧭",
  strategy: "♟️",
  sports: "⚽",
  racing: "🏎️",
  other: "🎮",
};

/** SEO：动态生成 meta 与 Open Graph */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";
  const enabled = hasServerEnv();
  if (!enabled) return {};
  const game = await getPublicGameBySlug(slug, localeCode);
  if (!game) return {};

  const title = `${game.title} · MossGap`;
  const description = game.description || `Play ${game.title} instantly on MossGap.`;
  const images = game.coverImage ? [game.coverImage] : undefined;

  return {
    title,
    description,
    keywords: [game.title, game.category, "browser game", "play online", "MossGap"],
    openGraph: {
      type: "website",
      title,
      description,
      images,
      siteName: "MossGap",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images,
    },
  };
}

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const t = await getTranslations("GameDetail");
  const tc = await getTranslations("Categories");
  const tf = await getTranslations("Feedback");

  const enabled = hasServerEnv();
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

  // 查询当前 IP 是否已点赞/点踩（SSR 注入）
  let initialLiked = false;
  let initialDisliked = false;
  if (enabled) {
    try {
      const h = await headers();
      const ip =
        h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
        h.get("cf-connecting-ip") ??
        "0.0.0.0";
      [initialLiked, initialDisliked] = await Promise.all([
        hasLiked(game.id, ip),
        hasDisliked(game.id, ip),
      ]);
    } catch {
      // 静默失败
    }
  }

  const related = enabled
    ? await listRelatedGames(game.category, game.id, localeCode, [], 6)
    : [];

  const screenshots = game.screenshots ?? [];
  const date = new Date(game.createdAt);
  const dateStr = date.toLocaleDateString(localeCode === "zh" ? "zh-CN" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const accent = CATEGORY_COLORS[game.category] ?? CATEGORY_COLORS.other;
  // howToPlay 兼容 object 与 string 两种类型
  const howToPlayRaw = game.howToPlay as unknown;
  const howToPlay =
    typeof howToPlayRaw === "string"
      ? howToPlayRaw
      : (howToPlayRaw as { en?: string; zh?: string })?.[localeCode] ??
        (howToPlayRaw as { en?: string; zh?: string })?.en ??
        "";

  // JSON-LD 结构化数据（SEO）
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VideoGame",
    name: game.title,
    description: game.description || `Play ${game.title} instantly on MossGap.`,
    genre: game.category,
    image: game.coverImage || undefined,
    screenshot: screenshots.length > 0 ? screenshots : undefined,
    url: `/games/${game.slug}`,
    playMode: "SinglePlayer",
    applicationCategory: "Game",
    operatingSystem: "Web Browser",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    aggregateRating: game.playCount > 0 ? {
      "@type": "AggregateRating",
      ratingValue: "4.5",
      ratingCount: game.playCount,
    } : undefined,
  };

  return (
    <div className="relative">
      {/* JSON-LD 结构化数据 */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* 返回 */}
        <Link
          href="/games"
          className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          {t("back")}
        </Link>

        {/* 游戏播放器 + 工具栏（参考 Poki，进入即可玩） */}
        <div className="mt-4 flex flex-col items-center">
          <GamePlayer
            src={game.playUrl}
            title={game.title}
            loadingLabel={t("loading") ?? "Loading..."}
          />
          <GameToolbar
            slug={game.slug}
            gameId={game.id}
            coverImage={game.coverImage}
            title={game.title}
            creator=""
            initialLiked={initialLiked}
            initialLikeCount={game.likeCount}
            initialDisliked={initialDisliked}
            initialDislikeCount={game.dislikeCount}
            accent={accent}
            feedbackLabels={{
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
            }}
          />
        </div>

        {/* 标题 + 元信息 */}
        <div className="mx-auto mt-5" style={{ maxWidth: 836 }}>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white"
              style={{ backgroundColor: accent }}
            >
              <span>{CATEGORY_EMOJI[game.category]}</span>
              {tc(game.category)}
            </span>
          </div>
          <h1 className="mt-3 font-heading text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl">
            {game.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Eye className="size-4" />
              {t("plays", { count: game.playCount })}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="size-4" />
              {dateStr}
            </span>
          </div>
        </div>

        {/* 介绍 + 玩法说明 */}
        <div className="mx-auto mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]" style={{ maxWidth: 836 }}>
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground">
              {t("description")}
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
              {game.description || "—"}
            </p>

            {/* 玩法说明 */}
            {howToPlay ? (
              <div className="mt-6 rounded-2xl border border-border/60 bg-card p-5 card-shadow">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Gamepad2 className="size-4" style={{ color: accent }} />
                  {t("howToPlay")}
                </h2>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                  {howToPlay}
                </p>
              </div>
            ) : null}
          </div>

          {/* 截图 */}
          {screenshots.length > 0 ? (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">
                {t("screenshots")}
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {screenshots.map((s, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={s}
                    alt={`screenshot-${i + 1}`}
                    className="aspect-video w-full rounded-xl border border-border/60 object-cover card-shadow"
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* 相关推荐 */}
        {related.length > 0 ? (
          <section className="mx-auto mt-16" style={{ maxWidth: 836 }}>
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
