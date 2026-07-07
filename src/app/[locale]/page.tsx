import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ChevronRight, Star, Flame, Clock, Gamepad2 } from "lucide-react";

import { GameCard } from "@/components/game-card";
import { listPublicGames, listFeaturedGames } from "@/db/queries";
import { GAME_CATEGORIES, CATEGORY_COLORS } from "@/types";
import type { GameCategory } from "@/types";
import { hasServerEnv } from "@/env";

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

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const tc = await getTranslations("Categories");

  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const enabled = hasServerEnv();
  const empty = { items: [] as Awaited<ReturnType<typeof listPublicGames>>["items"], total: 0 };
  const popular = enabled
    ? await listPublicGames({ page: 1, pageSize: 12, sort: "popular" }, localeCode)
    : empty;
  const newest = enabled
    ? await listPublicGames({ page: 1, pageSize: 12, sort: "newest" }, localeCode)
    : empty;
  const featured = enabled ? await listFeaturedGames(localeCode, 10) : [];

  const hasGames = popular.items.length > 0 || newest.items.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== 分类标签栏 ===== */}
      <div className="mb-6 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/games"
          className="inline-flex shrink-0 items-center rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {t("allCategories")}
        </Link>
        {GAME_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/games?category=${cat}`}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-card px-4 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
          >
            <span>{CATEGORY_EMOJI[cat]}</span>
            {tc(cat)}
          </Link>
        ))}
      </div>

      {/* ===== 推荐游戏（icon 横排） ===== */}
      {featured.length > 0 ? (
        <section className="mb-8">
          <SectionLabel icon={<Star className="size-4 text-amber-500" fill="currentColor" />} title={t("featuredTitle")} />
          <div className="flex gap-4 overflow-x-auto pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {featured.map((g) => (
              <Link
                key={g.id}
                href={`/games/${g.slug}`}
                className="group flex shrink-0 flex-col items-center gap-2"
              >
                <div className="relative size-20 overflow-hidden rounded-2xl border border-border/60 bg-background transition-transform duration-200 group-hover:scale-105 sm:size-24">
                  {g.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={g.coverImage}
                      alt={g.title}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="flex size-full items-center justify-center text-2xl"
                      style={{
                        background: `linear-gradient(135deg, ${CATEGORY_COLORS[g.category]}22, ${CATEGORY_COLORS[g.category]}44)`,
                      }}
                    >
                      {CATEGORY_EMOJI[g.category]}
                    </div>
                  )}
                </div>
                <span className="max-w-[5rem] truncate text-xs font-medium text-muted-foreground group-hover:text-foreground sm:max-w-[6rem]">
                  {g.title}
                </span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* ===== 热门游戏 ===== */}
      {popular.items.length > 0 ? (
        <section className="mb-10">
          <SectionLabel
            icon={<Flame className="size-4 text-orange-500" fill="currentColor" />}
            title={t("popularTitle")}
            action={
              <Link
                href="/games?sort=popular"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {t("viewAll")}
                <ChevronRight className="size-4" />
              </Link>
            }
          />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {popular.items.map((g) => (
              <GameCard key={g.id} game={g} size="compact" />
            ))}
          </div>
        </section>
      ) : null}

      {/* ===== 最新游戏 ===== */}
      {newest.items.length > 0 ? (
        <section className="mb-10">
          <SectionLabel
            icon={<Clock className="size-4 text-blue-500" />}
            title={t("newestTitle")}
            action={
              <Link
                href="/games?sort=newest"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                {t("viewAll")}
                <ChevronRight className="size-4" />
              </Link>
            }
          />
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {newest.items.map((g) => (
              <GameCard key={g.id} game={g} size="compact" />
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
            <p className="font-heading text-lg text-foreground">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("emptySubtitle")}</p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionLabel({
  icon,
  title,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
      </div>
      {action}
    </div>
  );
}
