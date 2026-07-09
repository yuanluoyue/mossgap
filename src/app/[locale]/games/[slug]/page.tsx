import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Play, Eye, Calendar } from "lucide-react";

import { GameCard } from "@/components/game-card";
import { getPublicGameBySlug, listRelatedGames } from "@/db/queries";
import { hasServerEnv } from "@/env";
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

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const t = await getTranslations("GameDetail");
  const tc = await getTranslations("Categories");

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

  return (
    <div className="relative">
      {/* 顶部渐变背景 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] overflow-hidden">
        <div className="absolute -top-32 left-1/3 size-[480px] rounded-full bg-primary opacity-10 blur-[120px]" />
        <div className="absolute -top-20 right-1/4 size-[420px] rounded-full bg-primary/60 opacity-10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 返回 */}
        <Link
          href="/games"
          className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
        >
          <ArrowLeft className="size-3.5" />
          {t("back")}
        </Link>

        {/* 主信息 */}
        <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
          {/* 左：封面 + 截图 */}
          <div>
            <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-muted">
              {game.coverImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={game.coverImage}
                  alt={game.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 via-cyan-100 to-teal-100">
                  <span className="font-heading text-9xl font-bold text-primary/15">
                    {game.title.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
            </div>

            {/* 截图 */}
            {screenshots.length > 0 ? (
              <div className="mt-4">
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                  {t("screenshots")}
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {screenshots.map((s, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={s}
                      alt={`screenshot-${i + 1}`}
                      className="aspect-video w-full rounded-lg border border-border object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {/* 右：信息 + CTA */}
          <div className="flex flex-col gap-6">
            <div>
              {/* 分类 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-primary">
                  <span>{CATEGORY_EMOJI[game.category]}</span>
                  {tc(game.category)}
                </span>
              </div>

              {/* 标题 */}
              <h1 className="mt-3 font-heading text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl">
                {game.title}
              </h1>

              {/* 元信息 */}
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <Eye className="size-3.5" />
                  {t("plays", { count: game.playCount })}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {dateStr}
                </span>
              </div>
            </div>

            {/* CTA */}
            <Link
              href={`/play/${game.slug}`}
              className="group relative inline-flex h-14 items-center justify-center gap-3 overflow-hidden rounded-xl bg-primary px-8 font-heading text-base font-bold uppercase tracking-widest text-primary-foreground shadow-md transition-all hover:shadow-lg"
            >
              <Play className="size-5 transition-transform group-hover:scale-110" fill="currentColor" />
              {t("play")}
              <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/30 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
            </Link>

            {/* 介绍 */}
            <div>
              <h2 className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                {t("description")}
              </h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground/80">
                {game.description || "—"}
              </p>
            </div>
          </div>
        </div>

        {/* 相关推荐 */}
        {related.length > 0 ? (
          <section className="mt-16">
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
