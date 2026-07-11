import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { getPublicGameBySlug, incrementPlayCount } from "@/db/queries";
import { hasServerEnv } from "@/env";
import { buildPageMetadata } from "@/lib/seo";
import { PlayFrame } from "./play-frame";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";
  const t = await getTranslations({ locale, namespace: "Seo" });

  const enabled = await hasServerEnv();
  const game = enabled ? await getPublicGameBySlug(slug, localeCode) : null;

  const title = game
    ? t("playTitle", { title: game.title })
    : t("gamesTitle");
  const description = game
    ? t("playDescription", { title: game.title })
    : t("gamesDescription");

  return buildPageMetadata({
    title,
    description,
    path: `/play/${slug}`,
    locale,
    noIndex: true,
  });
}

export default async function PlayPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  await setRequestLocale(locale);
  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";
  const t = await getTranslations("Play");

  const enabled = await hasServerEnv();
  const game = enabled ? await getPublicGameBySlug(slug, localeCode) : null;
  if (enabled && !game) notFound();

  if (!game) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <p className="font-heading text-2xl text-white">{t("loading")}</p>
        <p className="mt-2 text-sm text-white/40">DATABASE_URL not configured.</p>
      </div>
    );
  }

  // 浏览次数统计已暂时关闭（D1 免费写入次数有限）
  // if (enabled) {
  //   try {
  //     const h = await headers();
  //     const ip =
  //       h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
  //       h.get("cf-connecting-ip") ??
  //       "0.0.0.0";
  //     const ua = h.get("user-agent") ?? "unknown";
  //     void incrementPlayCount(game.id, ip, ua);
  //   } catch {
  //     // 静默失败：play count 不应影响游玩
  //   }
  // }

  return (
    <PlayFrame
      playUrl={game.playUrl}
      title={game.title}
      exitLabel={t("exit")}
      loadingLabel={t("loading")}
      backLabel={t("back")}
    />
  );
}
