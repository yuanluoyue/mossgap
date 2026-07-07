"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Gamepad2, Eye, Heart } from "lucide-react";

import type { PublicGame } from "@/types";
import { CATEGORY_COLORS } from "@/types";
import { cn } from "@/lib/utils";

interface GameCardProps {
  game: PublicGame;
  className?: string;
  /** 是否启用紧凑模式（列表页用大卡，相关推荐用小卡） */
  size?: "default" | "compact";
}

/** 占位渐变封面（无 coverImage 时使用，按分类取色） */
function gradientFor(category: keyof typeof CATEGORY_COLORS): string {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  return `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`;
}

export function GameCard({ game, className, size = "default" }: GameCardProps) {
  const t = useTranslations("Games");
  const format = useFormatter();
  const [loaded, setLoaded] = useState(false);

  const accent = CATEGORY_COLORS[game.category] ?? CATEGORY_COLORS.other;
  const slugInitial = game.title.charAt(0).toUpperCase();

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cn(
        "card-hover group relative flex flex-col overflow-hidden rounded-3xl border border-border/60 bg-card card-shadow hover:card-shadow-hover",
        className,
      )}
    >
      {/* 封面 */}
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {/* 占位背景：分类彩色渐变 */}
        <div
          className="absolute inset-0"
          style={{ background: gradientFor(game.category) }}
        />
        {/* 字母水印 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-heading font-bold text-white/40 transition-transform duration-500 group-hover:scale-110",
              size === "compact" ? "text-5xl" : "text-7xl",
            )}
          >
            {slugInitial}
          </span>
        </div>
        {/* 封面图（如有） */}
        {game.coverImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={game.coverImage}
            alt={game.title}
            loading="lazy"
            onLoad={() => setLoaded(true)}
            className={cn(
              "absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-105",
              loaded ? "opacity-100" : "opacity-0",
            )}
          />
        ) : null}
        {/* 顶部彩色细条（分类标识色） */}
        <div
          className="absolute inset-x-0 top-0 h-1"
          style={{ backgroundColor: accent }}
        />
        {/* 角标：分类 */}
        <span
          className="absolute top-3 left-3 rounded-full px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-sm"
          style={{ backgroundColor: accent }}
        >
          {game.category}
        </span>
        {/* hover 时浮现的 Play 按钮 */}
        <div className="absolute inset-0 flex items-end justify-center bg-gradient-to-t from-black/30 via-transparent to-transparent p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <span className="btn-press inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-xs font-semibold text-foreground shadow-md">
            <Gamepad2 className="size-3.5" style={{ color: accent }} />
            {t("play")}
          </span>
        </div>
      </div>

      {/* 信息区 */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <h3
          className={cn(
            "font-heading font-semibold leading-tight text-foreground transition-colors group-hover:text-primary",
            size === "compact" ? "text-sm" : "text-base",
          )}
        >
          {game.title}
        </h3>
        {size === "default" && game.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {game.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Eye className="size-3" />
            {format.number(game.playCount)}
          </span>
          {game.likeCount > 0 ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
              <Heart className="size-3" style={{ color: accent }} fill={accent} />
              {format.number(game.likeCount)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
