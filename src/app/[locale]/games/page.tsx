import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { SearchX } from "lucide-react";

import { GameCard } from "@/components/game-card";
import { GamesFilter } from "@/components/games-filter";
import { listPublicGames } from "@/db/queries";
import type { GameCategory } from "@/types";
import { GAME_CATEGORIES } from "@/types";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const revalidate = 300;

const PAGE_SIZE = 12;

function parseCategory(v: string | undefined): GameCategory | undefined {
  if (!v) return undefined;
  return GAME_CATEGORIES.includes(v as GameCategory)
    ? (v as GameCategory)
    : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seo" });
  return buildPageMetadata({
    title: t("gamesTitle"),
    description: t("gamesDescription"),
    path: "/games",
    locale,
  });
}

export default async function GamesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);
  const sp = await searchParams;

  const category = parseCategory(firstOf(sp.category));
  const sort: "popular" | "newest" =
    firstOf(sp.sort) === "popular" ? "popular" : "newest";
  const q = firstOf(sp.q);
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const t = await getTranslations("Games");

  const { items, total } = await listPublicGames(
    { page, pageSize: PAGE_SIZE, category, sort, q },
    localeCode,
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasResults = items.length > 0;

  const siteUrl = await getSiteUrl();
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
    ],
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {/* 页头 */}
      <header className="mb-8">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {t("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{t("subtitle")}</p>
      </header>

      {/* 筛选条 */}
      {/* <div className="mb-8 rounded-3xl border border-border/60 bg-card p-5 card-shadow">
        <GamesFilter
          activeCategory={category}
          activeSort={sort}
          activeQuery={q}
        />
      </div> */}

      {/* 结果统计 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("results", { count: total })}
        </p>
      </div>

      {/* 游戏网格 */}
      {hasResults ? (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,200px)] justify-center">
          {items.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center card-shadow">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-6" />
          </div>
          <p className="font-heading text-lg text-foreground">{t("empty")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("emptyHint")}
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
                    ? "btn-press inline-flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground card-shadow"
                    : "btn-press inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-sm font-medium text-muted-foreground card-shadow hover:text-foreground"
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
