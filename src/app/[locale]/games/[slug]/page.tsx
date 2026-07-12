import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import {
  getPublicGameBySlug,
  listPublishedGameSlugs,
} from "@/db/queries";
import { hasServerEnv } from "@/env";
import { routing } from "@/i18n/routing";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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

  // 加回 DB 查询，但只用最小渲染
  const enabled = await hasServerEnv();
  console.log("[GameDetail] enabled:", enabled, "slug:", slug);
  let game = null;
  try {
    game = enabled ? await getPublicGameBySlug(slug, localeCode) : null;
    console.log("[GameDetail] game found:", !!game, game ? { id: game.id, title: game.title, playUrl: game.playUrl } : null);
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

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-2xl font-bold">[Debug] Game Loaded</h1>
      <p className="mt-4 text-sm">id: {game.id}</p>
      <p className="text-sm">title: {game.title}</p>
      <p className="text-sm">slug: {game.slug}</p>
      <p className="text-sm">category: {game.category}</p>
      <p className="text-sm">playUrl: {game.playUrl || "(empty)"}</p>
      <p className="text-sm">likeCount: {game.likeCount}</p>
      <p className="mt-4 text-sm text-muted-foreground">{t("back")}</p>
    </div>
  );
}
