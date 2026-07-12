import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, SearchX } from "lucide-react";

import { GameCard } from "@/components/game-card";
import { getPublicCategoryBySlug, listGamesByCategory } from "@/db/queries";
import { hasServerEnv } from "@/env";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";
  const t = await getTranslations({ locale, namespace: "Seo" });

  const enabled = await hasServerEnv();
  const category = enabled
    ? await getPublicCategoryBySlug(slug, localeCode)
    : null;

  if (!category) {
    return buildPageMetadata({
      title: t("categoriesTitle"),
      description: t("categoriesDescription"),
      path: `/categories/${slug}`,
      locale,
    });
  }

  return buildPageMetadata({
    title: category.seoTitle || t("categoryTitle", { name: category.name }),
    description:
      category.seoDescription ||
      t("categoryDescription", { name: category.name }),
    path: `/categories/${slug}`,
    locale,
    ogImage: category.coverImage || undefined,
  });
}

export default async function CategoryDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale, slug } = await params;
  await setRequestLocale(locale);
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const sp = await searchParams;
  const sort: "popular" | "newest" =
    firstOf(sp.sort) === "popular" ? "popular" : "newest";
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);

  const t = await getTranslations("Taxonomy");

  const enabled = await hasServerEnv();
  const { items, total, category } = enabled
    ? await listGamesByCategory(
        slug,
        { page, pageSize: PAGE_SIZE, sort },
        localeCode,
      )
    : { items: [], total: 0, category: null };

  if (enabled && !category) notFound();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasResults = items.length > 0;
  const accent = category?.color || "#7c3aed";

  const siteUrl = await getSiteUrl();
  const categoryUrl = `${siteUrl}/categories/${slug}`;
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
        name: category?.name ?? slug,
        item: categoryUrl,
      },
    ],
  };

  const collectionPageJsonLd = category
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: category.name,
        description: category.description || undefined,
        url: categoryUrl,
        image: category.coverImage || undefined,
      }
    : null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd).replace(/</g, "\\u003c"),
        }}
      />
      {collectionPageJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(collectionPageJsonLd).replace(
              /</g,
              "\\u003c",
            ),
          }}
        />
      ) : null}

      {/* 返回 */}
      <Link
        href="/games"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        {t("back")}
      </Link>

      {/* 分类页头 */}
      <header
        className="mb-8 mt-4 border-l-4 pl-4"
        style={{ borderLeftColor: accent }}
      >
        <h1 className="flex items-center gap-3 font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {category?.icon ? (
            <span aria-hidden className="text-3xl sm:text-4xl">
              {category.icon}
            </span>
          ) : null}
          {category?.name ?? slug}
        </h1>
        {category?.description ? (
          <p className="mt-2 text-sm text-muted-foreground">
            {category.description}
          </p>
        ) : null}
      </header>

      {/* 排序 + 结果统计 */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t("gamesCount", { count: total })}
        </p>
        <div className="flex items-center gap-2">
          <SortLink sort="newest" active={sort} label={t("sortNewest")} />
          <SortLink sort="popular" active={sort} label={t("sortPopular")} />
        </div>
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
          <p className="font-heading text-lg text-foreground">{t("noGames")}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("noGamesHint")}
          </p>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 ? (
        <div className="mt-12 flex items-center justify-center gap-2">
          {Array.from({ length: totalPages }).map((_, i) => {
            const p = i + 1;
            const params = new URLSearchParams();
            if (sort) params.set("sort", sort);
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

function SortLink({
  sort,
  active,
  label,
}: {
  sort: "popular" | "newest";
  active: "popular" | "newest";
  label: string;
}) {
  const params = new URLSearchParams();
  params.set("sort", sort);
  return (
    <a
      href={`?${params.toString()}`}
      className={
        sort === active
          ? "inline-flex items-center rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground"
          : "inline-flex items-center rounded-full border border-border bg-card px-4 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      }
    >
      {label}
    </a>
  );
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
