import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SearchX, Gamepad2 } from "lucide-react";

import { listPublicCollections } from "@/db/queries";
import { hasServerEnv } from "@/env";
import { buildPageMetadata, getSiteUrl } from "@/lib/seo";
import { formatNumber } from "@/lib/format";
import { cn } from "@/lib/utils";

const COVER_GRADIENTS = [
  "from-sky-100 via-cyan-100 to-teal-100",
  "from-emerald-100 via-teal-100 to-cyan-100",
  "from-cyan-100 via-sky-100 to-blue-100",
  "from-teal-100 via-emerald-100 to-sky-100",
  "from-blue-100 via-cyan-100 to-teal-100",
];

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Seo" });
  return buildPageMetadata({
    title: t("collectionsTitle"),
    description: t("collectionsDescription"),
    path: "/collections",
    locale,
  });
}

export default async function CollectionsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  await setRequestLocale(locale);
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const t = await getTranslations("Taxonomy");
  const tc = await getTranslations("Collections");

  const enabled = await hasServerEnv();
  const collections = enabled
    ? await listPublicCollections(localeCode)
    : [];

  const hasResults = collections.length > 0;

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
        name: "Collections",
        item: `${siteUrl}/collections`,
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

      <header className="mb-8">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
          {tc("title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {tc("subtitle")}
        </p>
      </header>

      {hasResults ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
          {collections.map((c) => {
            const gradient =
              COVER_GRADIENTS[
                Math.abs(hashCode(c.slug)) % COVER_GRADIENTS.length
              ];
            const initial = c.name.charAt(0).toUpperCase();
            return (
              <Link
                key={c.id}
                href={`/collections/${c.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
              >
                <div className="relative aspect-[16/9] w-full overflow-hidden">
                  <div
                    className={cn(
                      "absolute inset-0 bg-gradient-to-br opacity-90 transition-opacity duration-500 group-hover:opacity-100",
                      gradient,
                    )}
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-heading text-6xl font-bold text-primary/15 transition-transform duration-500 group-hover:scale-110">
                      {initial}
                    </span>
                  </div>
                  {c.coverImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.coverImage}
                      alt={c.name}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
                </div>

                <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                  <h3 className="font-heading text-base font-semibold leading-tight text-foreground transition-colors group-hover:text-primary sm:text-lg">
                    {c.name}
                  </h3>
                  {c.description ? (
                    <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground sm:text-sm">
                      {c.description}
                    </p>
                  ) : null}
                  <div className="mt-auto pt-1.5">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
                      <Gamepad2 className="size-3" />
                      {formatNumber(c.gameCount)}
                    </span>
                  </div>
                </div>

                <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card p-16 text-center card-shadow">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <SearchX className="size-6" />
          </div>
          <p className="font-heading text-lg text-foreground">
            {t("collectionsEmpty")}
          </p>
        </div>
      )}
    </div>
  );
}
