import Link from "next/link";

import type { PublicGame } from "@/types";
import { cn } from "@/lib/utils";

interface GameCardProps {
  game: PublicGame;
  className?: string;
  size?: "default" | "compact";
}

/** 占位渐变封面（无 coverImage 时使用） */
const COVER_GRADIENTS = [
  "from-sky-200 via-cyan-200 to-teal-200",
  "from-emerald-200 via-teal-200 to-cyan-200",
  "from-cyan-200 via-sky-200 to-blue-200",
  "from-teal-200 via-emerald-200 to-sky-200",
  "from-blue-200 via-cyan-200 to-teal-200",
];

export function GameCard({ game, className, size }: GameCardProps) {
  const gradient = COVER_GRADIENTS[
    Math.abs(hashCode(game.slug)) % COVER_GRADIENTS.length
  ];
  const slugInitial = game.title.charAt(0).toUpperCase();

  return (
    <Link
      href={`/games/${game.slug}`}
      className={cn(
        "group relative block overflow-hidden rounded-xl border border-border shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md",
        className,
      )}
      style={{ width: 200, height: 200 }}
    >
      {/* 渐变占位背景 */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-br transition-opacity duration-500 group-hover:opacity-90",
          gradient,
        )}
      />
      {/* 字母水印 */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-heading text-7xl font-bold text-primary/15 transition-transform duration-500 group-hover:scale-110">
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
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      ) : null}
      {/* hover 时显示标题 */}
      <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100">
        <h3 className="line-clamp-2 px-2.5 pb-2 text-xs font-semibold leading-tight text-white">
          {game.title}
        </h3>
      </div>
      {/* 顶部扫描线动画 */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
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
