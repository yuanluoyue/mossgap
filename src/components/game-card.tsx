"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormatter } from "next-intl";
import { Heart } from "lucide-react";

import type { PublicGame } from "@/types";
import { CATEGORY_COLORS } from "@/types";
import { cn } from "@/lib/utils";

interface GameCardProps {
  game: PublicGame;
  className?: string;
  /** 兼容旧接口，实际不再使用 */
  size?: "default" | "compact";
}

/** 占位渐变封面（无 coverImage 时使用，按分类取色） */
function gradientFor(category: keyof typeof CATEGORY_COLORS): string {
  const color = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
  return `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`;
}

export function GameCard({ game, className, size }: GameCardProps) {
  const format = useFormatter();
  const [loaded, setLoaded] = useState(false);

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cn(
        "card-hover group relative block aspect-square w-full overflow-hidden rounded-2xl border border-border/60 bg-card card-shadow hover:card-shadow-hover",
        className,
      )}
    >
      {/* 占位背景 */}
      <div
        className="absolute inset-0"
        style={{ background: gradientFor(game.category) }}
      />
      {/* 字母水印 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading font-bold text-7xl text-white/40 transition-transform duration-500 group-hover:scale-110">
          {game.title.charAt(0).toUpperCase()}
        </span>
      </div>
      {/* 封面图 */}
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
      {/* 点赞数（绝对定位右下角） */}
      {game.likeCount > 0 ? (
        <span className="absolute bottom-2 right-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
          <Heart className="size-3" fill="currentColor" />
          {format.number(game.likeCount)}
        </span>
      ) : null}
    </Link>
  );
}
