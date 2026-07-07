"use client";

import { useState, useTransition } from "react";
import { Heart, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

interface LikeButtonProps {
  /** 游戏 slug，用于调用点赞 API */
  slug: string;
  initialLiked: boolean;
  initialCount: number;
  /** 当前用户未点赞时的辅助色（按分类） */
  accent?: string;
  likedLabel: string;
  likeLabel: string;
}

/**
 * 点赞按钮：按 IP 去重切换。
 * - 服务端初始状态由 SSR 注入
 * - 点击后乐观更新，失败回滚
 */
export function LikeButton({
  slug,
  initialLiked,
  initialCount,
  accent = "#7c3aed",
  likedLabel,
  likeLabel,
}: LikeButtonProps) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();
  const [prevSlug, setPrevSlug] = useState(slug);

  // 当 slug 变化时（路由切换到另一个游戏详情），重置内部状态
  // 这是 React 19 推荐的"调整 state 当 prop 变化"模式（render 期间 setState）
  if (prevSlug !== slug) {
    setPrevSlug(slug);
    setLiked(initialLiked);
    setCount(initialCount);
  }

  async function onToggle() {
    if (pending) return;
    const prevLiked = liked;
    const prevCount = count;
    // 乐观更新
    setLiked(!prevLiked);
    setCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);

    startTransition(async () => {
      try {
        const res = await fetch(`/api/games/${slug}/like`, {
          method: "POST",
        });
        const data = (await res.json()) as {
          success?: boolean;
          data?: { liked: boolean; likeCount: number };
          error?: { message?: string };
        };
        if (!res.ok || !data.success || !data.data) {
          // 回滚
          setLiked(prevLiked);
          setCount(prevCount);
          toast.error(data?.error?.message ?? "操作失败");
          return;
        }
        setLiked(data.data.liked);
        setCount(data.data.likeCount);
      } catch {
        setLiked(prevLiked);
        setCount(prevCount);
        toast.error("网络错误");
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={pending}
      aria-pressed={liked}
      className={cn(
        "btn-press inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
        liked
          ? "text-white shadow-sm"
          : "border border-border bg-card text-foreground hover:border-primary/30 card-shadow",
      )}
      style={liked ? { backgroundColor: accent } : undefined}
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Heart
          className="size-4"
          fill={liked ? "currentColor" : "none"}
        />
      )}
      <span>{count}</span>
      <span className="hidden text-xs font-medium opacity-80 sm:inline">
        {liked ? likedLabel : likeLabel}
      </span>
    </button>
  );
}
