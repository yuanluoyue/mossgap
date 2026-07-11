import type { MetadataRoute } from "next";

import { getSiteUrl, absoluteUrl } from "@/lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const siteUrl = await getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api", "/play/"],
    },
    sitemap: absoluteUrl(siteUrl, "/sitemap.xml"),
  };
}
