import { getTranslations } from "next-intl/server";
import { SearchX } from "lucide-react";

import { GameCard } from "@/components/game-card";
import { GamesFilter } from "@/components/games-filter";
import { listPublicGames } from "@/db/queries";
import { hasServerEnv } from "@/env";
import type { GameCategory } from "@/types";
import { GAME_CATEGORIES } from "@/types";

const PAGE_SIZE = 12;

function parseCategory(v: string | undefined): GameCategory | undefined {
  if (!v) return undefined;
  return GAME_CATEGORIES.includes(v as GameCategory)
    ? (v as GameCategory)
    : undefined;
}

export default async function GamesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  const sp = await searchParams;

  const category = parseCategory(firstOf(sp.category));
  const sort: "popular" | "newest" =
    firstOf(sp.sort) === "popular" ? "popular" : "newest";
  const q = firstOf(sp.q);
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const t = await getTranslations("Games");

  const enabled = hasServerEnv();
  const { items, total } = enabled
    ? await listPublicGames(
        { page, pageSize: PAGE_SIZE, category, sort, q },
        localeCode,
      )
    : { items: [], total: 0 };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasResults = items.length > 0;

  return (
    <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* 页头 */}
      <header className="mb-8">
        <p className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-neon-cyan)]">
          / games
        </p>
        <h1 className="mt-1 font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-white/50">{t("subtitle")}</p>
      </header>

      {/* 筛选条 */}
      <div className="mb-8 rounded-xl border border-white/5 bg-white/[0.02] p-4 backdrop-blur-sm">
        <GamesFilter
          activeCategory={category}
          activeSort={sort}
          activeQuery={q}
        />
      </div>

      {/* 结果统计 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="font-mono text-xs uppercase tracking-widest text-white/40">
          {t("results", { count: total })}
        </p>
      </div>

      {/* 游戏网格 */}
      {hasResults ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-16 text-center">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-white/5 text-white/40">
            <SearchX className="size-6" />
          </div>
          <p className="font-heading text-lg text-white/80">{t("empty")}</p>
          <p className="mt-2 text-sm text-white/40">
            Try a different category or search term.
          </p>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 ? (
        <div className="mt-12 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const params = new URLSearchParams();
            if (category) params.set("category", category);
            if (sort) params.set("sort", sort);
            if (q) params.set("q", q);
            params.set("page", String(p));
            return (
              <a
                key={p}
                href={`?${params.toString()}`}
                className={
                  p === page
                    ? "inline-flex size-9 items-center justify-center rounded-md border border-[oklch(from_var(--color-neon-cyan)_l_c_h_/_50%)] bg-[oklch(from_var(--color-neon-cyan)_l_c_h_/_12%)] font-mono text-sm text-[var(--color-neon-cyan)]"
                    : "inline-flex size-9 items-center justify-center rounded-md border border-white/10 bg-white/[0.02] font-mono text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white"
                }
              >
                {p}
              </a>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
