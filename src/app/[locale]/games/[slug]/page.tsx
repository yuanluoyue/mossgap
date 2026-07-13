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
} from "@/db/queries";
import { getClientIp } from "@/lib/api-guard";
import { hasServerEnv } from "@/env";
import { CATEGORY_COLORS } from "@/types";
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
  let game = null;
  try {
    game = enabled ? await getPublicGameBySlug(slug, localeCode) : null;
  } catch (err) {
    console.error("[GameDetail] getPublicGameBySlug error:", err);
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold text-red-600">[Debug] DB Query Error</h1>
        <pre className="mt-4 whitespace-pre-wrap break-all rounded-lg border border-red-200 bg-red-50 p-4 font-mono text-xs text-red-900">
{err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ""}` : String(err)}
        </pre>
      </div>
    );
  }
  if (!game) notFound();

  const accent = CATEGORY_COLORS[game.category] ?? "#7c3aed";
  const clientIp = await getClientIp().catch(() => "0.0.0.0");
  const [related, liked, disliked] = await Promise.all([
    listRelatedGames(game.category, game.id, localeCode, [], 6).then(
      (r) => r,
      () => [] as Awaited<ReturnType<typeof listRelatedGames>>,
    ),
    hasLiked(game.id, clientIp).then(
      (v) => v,
      () => false,
    ),
    hasDisliked(game.id, clientIp).then(
      (v) => v,
      () => false,
    ),
  ]);

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
      { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
      { "@type": "ListItem", position: 2, name: "Games", item: `${siteUrl}/games` },
      { "@type": "ListItem", position: 3, name: game.title, item: gameUrl },
    ],
  };

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
      <div className="relative mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <Link
          href="/games"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          {t("back")}
        </Link>

        <div className="mt-4 flex flex-col items-center">
          <div className="overflow-hidden rounded-md shadow-sm">
            <GamePlayer src={game.playUrl} title={game.title} loadingLabel={t("loading")} />
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
        </div>

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

        {related.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-heading text-2xl font-bold tracking-tight text-foreground">
              {t("related")}
            </h2>
            <div className="mt-5 grid gap-4 [grid-template-columns:repeat(auto-fill,200px)] justify-center">
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
