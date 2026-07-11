import type { Metadata } from "next";

export const SITE_NAME = "MossGap";
export const SITE_TAGLINE_EN = "Play browser games instantly";
export const SITE_TAGLINE_ZH = "免费在线网页游戏";
export const SITE_LOCALES = ["en", "zh"] as const;
export const DEFAULT_LOCALE = "en";

const FALLBACK_URL = "http://localhost:3000";

async function readEnvVar(key: string): Promise<string | undefined> {
  const fromProcess = process.env[key];
  if (fromProcess) return fromProcess;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const val = (ctx.env as unknown as Record<string, string | undefined>)[key];
    if (val) return val;
  } catch {
    // 非 Cloudflare 运行时，忽略
  }
  return undefined;
}

export async function getSiteUrl(): Promise<string> {
  const url = await readEnvVar("NEXT_PUBLIC_APP_URL");
  return (url ?? FALLBACK_URL).replace(/\/+$/, "");
}

export function getDefaultOgImage(siteUrl: string): string {
  return `${siteUrl}/bg.png`;
}

export function absoluteUrl(siteUrl: string, path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${siteUrl}${p}`;
}

interface PageMetaInput {
  title: string;
  description: string;
  path: string;
  locale: string;
  ogImage?: string;
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
}

export async function buildPageMetadata(
  input: PageMetaInput,
): Promise<Metadata> {
  const siteUrl = await getSiteUrl();
  const canonical = absoluteUrl(siteUrl, input.path);
  const ogImage = input.ogImage ?? getDefaultOgImage(siteUrl);

  return {
    title: input.title,
    description: input.description,
    alternates: {
      canonical: input.path,
    },
    openGraph: {
      title: input.title,
      description: input.description,
      url: canonical,
      siteName: SITE_NAME,
      locale: input.locale === "zh" ? "zh_CN" : "en_US",
      type: input.type ?? "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: input.title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      images: [ogImage],
    },
    ...(input.noIndex ? { robots: { index: false, follow: false } } : {}),
  };
}
