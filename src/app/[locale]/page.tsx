import { ArrowRight, Sparkles, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { GameCard } from "@/components/game-card";
import { listPublicGames } from "@/db/queries";
import { GAME_CATEGORIES } from "@/types";
import type { GameCategory } from "@/types";
import { hasServerEnv } from "@/env";

// 分类对应的图标
const CATEGORY_EMOJI: Record<GameCategory, string> = {
  action: "⚔️",
  puzzle: "🧩",
  arcade: "👾",
  adventure: "🧭",
  strategy: "♟️",
  sports: "⚽",
  racing: "🏎️",
  other: "🎮",
};

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Home");
  const tc = await getTranslations("Categories");

  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  // 数据库未配置时使用空数据，避免 dev 启动崩溃
  const enabled = hasServerEnv();
  const empty = { items: [] as Awaited<ReturnType<typeof listPublicGames>>["items"], total: 0 };
  const popular = enabled
    ? await listPublicGames({ page: 1, pageSize: 6, sort: "popular" }, localeCode)
    : empty;
  const newest = enabled
    ? await listPublicGames({ page: 1, pageSize: 6, sort: "newest" }, localeCode)
    : empty;

  return (
    <div className="relative">
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        {/* 装饰光斑 */}
        <div className="pointer-events-none absolute -top-32 left-1/4 size-[480px] rounded-full bg-[var(--color-neon-violet)] opacity-20 blur-[120px]" />
        <div className="pointer-events-none absolute -top-20 right-1/4 size-[420px] rounded-full bg-[var(--color-neon-cyan)] opacity-15 blur-[120px]" />

        <div className="relative mx-auto max-w-7xl px-4 pt-20 pb-24 sm:px-6 lg:px-8 lg:pt-28 lg:pb-32">
          <div className="mx-auto max-w-3xl text-center">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[oklch(from_var(--color-neon-cyan)_l_c_h_/_30%)] bg-[oklch(from_var(--color-neon-cyan)_l_c_h_/_8%)] px-3 py-1 font-mono text-[11px] uppercase tracking-widest text-[var(--color-neon-cyan)]">
              <Sparkles className="size-3" />
              {t("heroBadge")}
            </div>

            {/* 标题 */}
            <h1 className="font-heading text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl">
              {t("heroTitle")}
              <br />
              <span className="neon-text-cyan">{t("heroTitleAccent")}</span>
            </h1>

            {/* 副标题 */}
            <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
              {t("heroSubtitle")}
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/games"
                className="group inline-flex h-11 items-center gap-2 rounded-lg bg-gradient-to-r from-[var(--color-neon-cyan)] to-[var(--color-neon-violet)] px-6 font-mono text-sm font-semibold uppercase tracking-widest text-black shadow-[0_0_28px_-4px_var(--color-neon-cyan)] transition-all hover:shadow-[0_0_36px_-2px_var(--color-neon-cyan)]"
              >
                {t("heroCta")}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </Link>
              <Link
                href="/games"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-6 font-mono text-sm font-semibold uppercase tracking-widest text-white/80 backdrop-blur-sm transition-colors hover:border-white/30 hover:text-white"
              >
                {t("heroSecondary")}
              </Link>
            </div>
          </div>

          {/* 数据徽标 */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/40">
            <span className="inline-flex items-center gap-2">
              <Zap className="size-3 text-[var(--color-neon-cyan)]" />
              Instant Play
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--color-neon-cyan)]" />
              No installs
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-[var(--color-neon-violet)]" />
              Powered by Cloudflare
            </span>
          </div>
        </div>
      </section>

      {/* ===== 分类导航 ===== */}
      <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <SectionHeader
          title={t("categoriesTitle")}
          subtitle=""
        />
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {GAME_CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/games?category=${cat}`}
              className="group relative flex aspect-square flex-col items-center justify-center gap-2 rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-all hover:-translate-y-1 hover:border-[oklch(from_var(--color-neon-cyan)_l_c_h_/_40%)] hover:bg-[oklch(from_var(--color-neon-cyan)_l_c_h_/_6%)]"
            >
              <span className="text-3xl transition-transform duration-300 group-hover:scale-110">
                {CATEGORY_EMOJI[cat]}
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/60 group-hover:text-[var(--color-neon-cyan)]">
                {tc(cat)}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== 热门 ===== */}
      {popular.items.length > 0 ? (
        <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeader
            title={t("popularTitle")}
            subtitle={t("popularSubtitle")}
            action={
              <Link
                href="/games?sort=popular"
                className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-[var(--color-neon-cyan)] hover:underline"
              >
                {t("viewAll")}
                <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {popular.items.map((g) => (
              <GameCard key={g.id} game={g} size="compact" />
            ))}
          </div>
        </section>
      ) : null}

      {/* ===== 最新 ===== */}
      {newest.items.length > 0 ? (
        <section className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <SectionHeader
            title={t("newestTitle")}
            subtitle={t("newestSubtitle")}
            action={
              <Link
                href="/games?sort=newest"
                className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-widest text-[var(--color-neon-cyan)] hover:underline"
              >
                {t("viewAll")}
                <ChevronRight className="size-3.5" />
              </Link>
            }
          />
          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {newest.items.map((g) => (
              <GameCard key={g.id} game={g} size="compact" />
            ))}
          </div>
        </section>
      ) : null}

      {/* 空状态 */}
      {popular.items.length === 0 && newest.items.length === 0 ? (
        <section className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-[oklch(from_var(--color-neon-cyan)_l_c_h_/_8%)] text-3xl">
              🎮
            </div>
            <p className="font-heading text-lg text-white/80">No games yet</p>
            <p className="mt-2 text-sm text-white/40">
              Games uploaded from the admin panel will appear here.
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        <h2 className="font-heading text-2xl font-bold tracking-tight text-white sm:text-3xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-white/50">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
