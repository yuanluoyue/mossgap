"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormatter, useTranslations } from "next-intl";
import { Gamepad2, Eye } from "lucide-react";

import type { PublicGame } from "@/types";
import { cn } from "@/lib/utils";

interface GameCardProps {
  game: PublicGame;
  className?: string;
  /** 是否启用紧凑模式（列表页用大卡，相关推荐用小卡） */
  size?: "default" | "compact";
}

/** 占位渐变封面（无 coverImage 时使用） */
const COVER_GRADIENTS = [
  "from-[#1a1a2e] via-[#16213e] to-[#0f3460]",
  "from-[#2d0a4e] via-[#1a0640] to-[#0a0a0f]",
  "from-[#0a0a0f] via-[#101028] to-[#1a0640]",
  "from-[#0f3460] via-[#533483] to-[#e94560]",
  "from-[#0a0a0f] via-[#101935] to-[#00f0ff]",
];

export function GameCard({ game, className, size = "default" }: GameCardProps) {
  const t = useTranslations("Games");
  const format = useFormatter();
  const [loaded, setLoaded] = useState(false);

  const gradient = COVER_GRADIENTS[
    Math.abs(hashCode(game.slug)) % COVER_GRADIENTS.length
  ];

  const slugInitial = game.title.charAt(0).toUpperCase();

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-white/5 bg-[var(--color-neon-surface)]/60 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-[oklch(from_var(--color-neon-cyan)_l_c_h_/_40%)] hover:shadow-[0_8px_40px_-12px_oklch(from_var(--color-neon-cyan)_l_c_h_/_45%)]",
        className,
      )}
    >
      {/* 封面 */}
      <div
        className={cn(
          "relative aspect-[16/10] w-full overflow-hidden",
        )}
      >
        <div
          className={cn(
            "absolute inset-0 bg-gradient-to-br opacity-90 transition-opacity duration-500 group-hover:opacity-100",
            gradient,
          )}
        />
        {/* 网格纹理 */}
        <div className="absolute inset-0 neon-grid opacity-30 mix-blend-overlay" />
        {/* 字母水印 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              "font-heading font-bold text-white/15 transition-transform duration-500 group-hover:scale-110",
              size === "compact" ? "text-6xl" : "text-8xl",
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
        {/* 暗角渐变 */}
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-neon-bg)] via-transparent to-transparent" />
        {/* 角标：分类 */}
        <span className="absolute top-2 left-2 rounded-md border border-white/10 bg-black/40 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-white/70 backdrop-blur-md">
          {game.category}
        </span>
      </div>

      {/* 信息区 */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <h3
          className={cn(
            "font-heading font-semibold leading-tight text-white transition-colors group-hover:text-[var(--color-neon-cyan)]",
            size === "compact" ? "text-sm" : "text-base",
          )}
        >
          {game.title}
        </h3>
        {size === "default" && game.description ? (
          <p className="line-clamp-2 text-xs leading-relaxed text-white/50">
            {game.description}
          </p>
        ) : null}

        <div className="mt-auto flex items-center justify-between pt-1.5">
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-white/40">
            <Eye className="size-3" />
            {format.number(game.playCount)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-md border border-[oklch(from_var(--color-neon-cyan)_l_c_h_/_30%)] bg-[oklch(from_var(--color-neon-cyan)_l_c_h_/_8%)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-[var(--color-neon-cyan)] transition-colors group-hover:bg-[oklch(from_var(--color-neon-cyan)_l_c_h_/_18%)]">
            <Gamepad2 className="size-3" />
            {t("play")}
          </span>
        </div>
      </div>

      {/* 顶部扫描线动画（hover 触发） */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-neon-cyan)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
    </Link>
  );
}

function hashCode(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return h;
}
