import { getTranslations } from "next-intl/server";
import { ChevronRight, Star, Flame, Clock, Gamepad2 } from "lucide-react";

import { GameCard } from "@/components/game-card";
import { listPublicGames, listFeaturedGames } from "@/db/queries";

import { hasServerEnv } from "@/env";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations("Home");

  const localeCode = (locale === "zh" ? "zh" : "en") as "en" | "zh";

  const enabled = hasServerEnv();
  const empty = {
    items: [] as Awaited<ReturnType<typeof listPublicGames>>["items"],
    total: 0,
  };
  const popular = enabled
    ? await listPublicGames(
        { page: 1, pageSize: 12, sort: "popular" },
        localeCode,
      )
    : empty;
  const newest = enabled
    ? await listPublicGames(
        { page: 1, pageSize: 12, sort: "newest" },
        localeCode,
      )
    : empty;

  const hasGames = popular.items.length > 0 || newest.items.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      {/* ===== 最新游戏 ===== */}
      {newest.items.length > 0 ? (
        <section className="mb-10">
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {newest.items.map((g) => (
              <GameCard key={g.id} game={g} size="compact" />
            ))}
          </div>
        </section>
      ) : null}

      {/* 空状态 */}
      {!hasGames ? (
        <section className="py-20">
          <div className="rounded-3xl border border-dashed border-border bg-card p-12 text-center">
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-primary/10 text-3xl">
              <Gamepad2 className="size-7 text-primary" />
            </div>
            <p className="font-heading text-lg text-foreground">
              {t("emptyTitle")}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("emptySubtitle")}
            </p>
          </div>
        </section>
      ) : null}
    </div>
  );
}
