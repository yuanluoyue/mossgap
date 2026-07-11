import type { MetadataRoute } from "next";

import { listPublishedGameSlugs } from "@/db/queries";
import { hasServerEnv } from "@/env";
import { getSiteUrl, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl(siteUrl, "/games"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl(siteUrl, "/about"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl(siteUrl, "/contact"),
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl(siteUrl, "/privacy"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl(siteUrl, "/terms"),
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const enabled = await hasServerEnv();
  if (!enabled) {
    return staticPages;
  }

  const games = await listPublishedGameSlugs();
  const gamePages: MetadataRoute.Sitemap = games.map((g) => ({
    url: absoluteUrl(siteUrl, `/games/${g.slug}`),
    lastModified: g.updatedAt ? new Date(g.updatedAt * 1000) : now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  return [...staticPages, ...gamePages];
}
