import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { setRequestLocale } from "next-intl/server";
import { SearchX, ChevronLeft, ChevronRight } from "lucide-react";

import { GameCard } from "@/components/game-card";
import { GamesFilter } from "@/components/games-filter";
import {
  listGameCards,
  getPublicCategoryBySlug,
  listPublicCategories,
  listPublicTags,
} from "@/db/queries";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { cn } from "@/lib/utils";

export const revalidate = 0;
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "Seo" });
  // 带筛选/搜索/分页参数的页面不索引，避免参数化 URL 稀释主页面权重
  const hasFilters = Boolean(sp.q || sp.page || sp.category || sp.sort);
  return buildPageMetadata({
    title: t("gamesTitle"),
    description: t("gamesDescription"),
    path: "/games",
    locale,
    noIndex: hasFilters,
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

  const categorySlug = firstOf(sp.category);
  const sort: "popular" | "newest" =
    firstOf(sp.sort) === "popular" ? "popular" : "newest";
  const q = firstOf(sp.q);
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const t = await getTranslations("Games");

  // ?category=xxx 现在按 slug 查 categories 表拿 categoryId
  let categoryId: string | undefined;
  if (categorySlug) {
    const cat = await getPublicCategoryBySlug(categorySlug, localeCode).catch(
      () => null,
    );
    if (cat) categoryId = cat.id;
  }

  // 拉取所有可见分类供筛选下拉使用
  const allCategories = await listPublicCategories(localeCode).catch(() => []);
  // 拉取所有可见标签供筛选下拉使用（选中后跳转到 /tags/[slug] 聚合页）
  const allTags = await listPublicTags(localeCode).catch(() => []);

  const { items, total } = await listGameCards(
    { page, pageSize: PAGE_SIZE, categoryId, sort, q },
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

  // 构建分页 URL 的辅助函数
  function pageHref(p: number): string {
    const params = new URLSearchParams();
    if (categorySlug) params.set("category", categorySlug);
    if (sort !== "newest") params.set("sort", sort);
    if (q) params.set("q", q);
    if (p !== 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  // 窗口式分页：1 ... (p-1) p (p+1) ... totalPages
  const pageNumbers: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (page > 3) pageNumbers.push("...");
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      pageNumbers.push(i);
    }
    if (page < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

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

      {/* 筛选条：分类 + 标签 + 搜索 + 排序 */}
      <GamesFilter
        categories={allCategories.map((c) => ({
          slug: c.slug,
          name: c.name,
          gameCount: c.gameCount,
        }))}
        tags={allTags.map((t) => ({
          slug: t.slug,
          name: t.name,
          gameCount: t.gameCount,
        }))}
      />

      {/* 结果统计 */}
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("results", { count: total })}
        </p>
        {totalPages > 1 ? (
          <p className="text-sm text-muted-foreground">
            {t("pageOf", { page, total: totalPages })}
          </p>
        ) : null}
      </div>

      {/* 游戏网格 */}
      {hasResults ? (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:[grid-template-columns:repeat(auto-fill,200px)] sm:justify-center">
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

      {/* 分页：prev + 窗口页码 + next */}
      {totalPages > 1 ? (
        <nav
          className="mt-12 flex items-center justify-center gap-2"
          aria-label="Pagination"
        >
          {/* 上一页 */}
          <a
            href={pageHref(Math.max(1, page - 1))}
            aria-label={t("prev")}
            aria-disabled={page <= 1}
            className={cn(
              "btn-press inline-flex size-10 items-center justify-center rounded-full border border-border bg-card card-shadow hover:text-foreground",
              page <= 1 && "pointer-events-none opacity-40",
            )}
          >
            <ChevronLeft className="size-4" />
          </a>

          {/* 页码 */}
          {pageNumbers.map((p, i) =>
            p === "..." ? (
              <span
                key={`dot-${i}`}
                className="inline-flex size-10 items-center justify-center text-sm text-muted-foreground"
              >
                ...
              </span>
            ) : (
              <a
                key={p}
                href={pageHref(p)}
                aria-label={`Page ${p}`}
                aria-current={p === page ? "page" : undefined}
                className={
                  p === page
                    ? "btn-press inline-flex size-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground card-shadow"
                    : "btn-press inline-flex size-10 items-center justify-center rounded-full border border-border bg-card text-sm font-medium text-muted-foreground card-shadow hover:text-foreground"
                }
              >
                {p}
              </a>
            ),
          )}

          {/* 下一页 */}
          <a
            href={pageHref(Math.min(totalPages, page + 1))}
            aria-label={t("next")}
            aria-disabled={page >= totalPages}
            className={cn(
              "btn-press inline-flex size-10 items-center justify-center rounded-full border border-border bg-card card-shadow hover:text-foreground",
              page >= totalPages && "pointer-events-none opacity-40",
            )}
          >
            <ChevronRight className="size-4" />
          </a>
        </nav>
      ) : null}
    </div>
  );
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
