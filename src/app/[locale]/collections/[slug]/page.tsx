import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, SearchX } from "lucide-react";

import { GameCard } from "@/components/game-card";
import {
  getPublicCollectionBySlug,
  listGamesByCollection,
} from "@/db/queries";
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
  const collection = enabled
    ? await getPublicCollectionBySlug(slug, localeCode)
    : null;

  if (!collection) {
    return buildPageMetadata({
      title: t("collectionsTitle"),
      description: t("collectionsDescription"),
      path: `/collections/${slug}`,
      locale,
    });
  }

  return buildPageMetadata({
    title:
      collection.seoTitle || t("collectionTitle", { name: collection.name }),
    description:
      collection.seoDescription ||
      t("collectionDescription", { name: collection.name }),
    path: `/collections/${slug}`,
    locale,
    ogImage: collection.coverImage || undefined,
  });
}

export default async function CollectionDetailPage({
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
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);

  const t = await getTranslations("Taxonomy");

  const enabled = await hasServerEnv();
  const { items, total, collection } = enabled
    ? await listGamesByCollection(
        slug,
        { page, pageSize: PAGE_SIZE },
        localeCode,
      )
    : { items: [], total: 0, collection: null };

  if (enabled && !collection) notFound();

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasResults = items.length > 0;
  const layout = collection?.layout ?? "grid";

  const siteUrl = await getSiteUrl();
  const collectionUrl = `${siteUrl}/collections/${slug}`;
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
        name: "Collections",
        item: `${siteUrl}/collections`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: collection?.name ?? slug,
        item: collectionUrl,
      },
    ],
  };

  const collectionPageJsonLd = collection
    ? {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: collection.name,
        description: collection.description || undefined,
        url: collectionUrl,
        image: collection.coverImage || undefined,
      }
    : null;

  const heroGame = layout === "hero" && items.length > 0 ? items[0] : null;
  const restGames = layout === "hero" && heroGame ? items.slice(1) : items;

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
        href="/collections"
        className="inline-flex items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-muted-foreground transition-colors hover:text-primary"
      >
        <ArrowLeft className="size-3.5" />
        {t("back")}
      </Link>

      {/* 专题页头 */}
      {collection?.coverImage ? (
        <div className="relative mt-4 aspect-[21/9] w-full overflow-hidden rounded-2xl border border-border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={collection.coverImage}
            alt={collection.name}
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
          <div className="absolute bottom-0 left-0 p-6 sm:p-8">
            <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground drop-shadow sm:text-5xl">
              {collection.name}
            </h1>
            {collection.description ? (
              <p className="mt-2 max-w-2xl text-sm text-foreground/80">
                {collection.description}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <header className="mt-4">
          <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            {collection?.name ?? slug}
          </h1>
          {collection?.description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {collection.description}
            </p>
          ) : null}
        </header>
      )}

      {/* 结果统计 */}
      <div className="mb-4 mt-8 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {t("gamesCount", { count: total })}
        </p>
      </div>

      {/* 游戏网格 */}
      {hasResults ? (
        <>
          {heroGame ? (
            <section className="mb-8">
              <GameCard game={heroGame} />
            </section>
          ) : null}

          {restGames.length > 0 ? (
            layout === "list" ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {restGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            ) : layout === "carousel" ? (
              <div className="-mx-4 flex gap-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0">
                {restGames.map((g) => (
                  <div key={g.id} className="w-64 shrink-0 sm:w-72">
                    <GameCard game={g} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,200px)] justify-center">
                {restGames.map((g) => (
                  <GameCard key={g.id} game={g} />
                ))}
              </div>
            )
          ) : null}
        </>
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
