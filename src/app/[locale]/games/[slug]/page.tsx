import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { GamePlayer } from "@/components/game-player";
import { GameToolbar } from "@/components/game-toolbar";
import {
  getPublicGameBySlug,
} from "@/db/queries";
import { hasServerEnv } from "@/env";
import { CATEGORY_COLORS } from "@/types";
import { buildPageMetadata } from "@/lib/seo";

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

  // 加回 GameToolbar，但不加点赞查询（用 false 兜底）
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">[Debug] With GameToolbar</h1>
      <p className="mt-4 text-sm">title: {game.title}</p>
      <div className="mt-4 flex flex-col items-center">
        <GamePlayer src={game.playUrl} title={game.title} loadingLabel={t("loading")} />
        <GameToolbar
          slug={game.slug}
          gameId={game.id}
          coverImage={game.coverImage}
          title={game.title}
          creator=""
          initialLiked={false}
          initialLikeCount={game.likeCount}
          initialDisliked={false}
          initialDislikeCount={game.dislikeCount}
          accent={accent}
          feedbackLabels={feedbackLabels}
        />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">GameToolbar rendered above</p>
    </div>
  );
}
