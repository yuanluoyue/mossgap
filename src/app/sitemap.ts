import type { MetadataRoute } from "next";

import {
  listPublishedGameSlugs,
  listPublicCategorySlugs,
  listPublicTagSlugs,
  listPublicCollectionSlugs,
} from "@/db/queries";
import { hasServerEnv } from "@/env";
import { getSiteUrl, absoluteUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

/**
 * 构建时间戳（模块级常量）。
 *
 * 用于静态页（about/privacy/terms 等）的 lastModified，避免每次请求都用 `now`
 * 导致搜索引擎认为页面每天都在变、降低信任度。静态页内容基本不变，
 * 用构建时间足够反映实际变更。
 */
const BUILD_TIME = new Date();

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = await getSiteUrl();

  // ── 静态页面 ──────────────────────────────────────────────
  // 静态页用 BUILD_TIME，避免每次请求都更新 lastModified。
  // 首页用最新游戏的 updatedAt（见下方动态计算），反映内容实际变化。
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: BUILD_TIME,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: absoluteUrl(siteUrl, "/games"),
      lastModified: BUILD_TIME,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: absoluteUrl(siteUrl, "/about"),
      lastModified: BUILD_TIME,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl(siteUrl, "/contact"),
      lastModified: BUILD_TIME,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: absoluteUrl(siteUrl, "/privacy"),
      lastModified: BUILD_TIME,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl(siteUrl, "/terms"),
      lastModified: BUILD_TIME,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: absoluteUrl(siteUrl, "/copyright-notice"),
      lastModified: BUILD_TIME,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const enabled = await hasServerEnv();
  if (!enabled) {
    return staticPages;
  }

  // ── 动态页面（并行查询降低延迟） ─────────────────────────
  const [games, categories, tags, collections] = await Promise.all([
    listPublishedGameSlugs().catch(() => []),
    listPublicCategorySlugs().catch(() => []),
    listPublicTagSlugs().catch(() => []),
    listPublicCollectionSlugs().catch(() => []),
  ]);

  // 首页 lastModified 用最新游戏的 updatedAt（如果有），
  // 比 BUILD_TIME 更能反映内容实际变化。
  const latestGameUpdate = games.reduce<number | null>((max, g) => {
    if (!g.updatedAt) return max;
    return max === null || g.updatedAt > max ? g.updatedAt : max;
  }, null);
  if (latestGameUpdate) {
    staticPages[0].lastModified = new Date(latestGameUpdate * 1000);
    // /games 列表页同样跟随最新游戏更新
    staticPages[1].lastModified = new Date(latestGameUpdate * 1000);
  }

  const gamePages: MetadataRoute.Sitemap = games.map((g) => ({
    url: absoluteUrl(siteUrl, `/games/${g.slug}`),
    lastModified: g.updatedAt ? new Date(g.updatedAt * 1000) : BUILD_TIME,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  // 聚合页（分类/标签/专题）：SEO 价值高，priority 0.7，weekly 更新
  const categoryPages: MetadataRoute.Sitemap = categories.map((c) => ({
    url: absoluteUrl(siteUrl, `/categories/${c.slug}`),
    lastModified: c.updatedAt ? new Date(c.updatedAt * 1000) : BUILD_TIME,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  const tagPages: MetadataRoute.Sitemap = tags.map((t) => ({
    url: absoluteUrl(siteUrl, `/tags/${t.slug}`),
    lastModified: t.updatedAt ? new Date(t.updatedAt * 1000) : BUILD_TIME,
    changeFrequency: "weekly",
    priority: 0.6,
  }));

  const collectionPages: MetadataRoute.Sitemap = collections.map((c) => ({
    url: absoluteUrl(siteUrl, `/collections/${c.slug}`),
    lastModified: c.updatedAt ? new Date(c.updatedAt * 1000) : BUILD_TIME,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [
    ...staticPages,
    ...gamePages,
    ...categoryPages,
    ...tagPages,
    ...collectionPages,
  ];
}
