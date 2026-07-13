"use client";

import { useState, useTransition } from "react";
import {
  Maximize,
  Minimize,
  ThumbsUp,
  ThumbsDown,
  MessageSquare,
} from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { FeedbackDialog } from "@/components/feedback-dialog";
import { analytics } from "@/sdk";

interface GameToolbarProps {
  /** 游戏 slug，用于调用点赞/点踩 API */
  slug: string;
  /** 游戏 ID，用于反馈 */
  gameId: string;
  /** 游戏封面 URL，用作工具栏小 icon */
  coverImage: string;
  /** 游戏名称 */
  title: string;
  /** 游戏制作方 */
  creator: string;
  /** 初始是否已点赞 */
  initialLiked: boolean;
  /** 初始点赞数 */
  initialLikeCount: number;
  /** 初始是否已点踩 */
  initialDisliked: boolean;
  /** 初始点踩数 */
  initialDislikeCount: number;
  /** 分类 accent 色 */
  accent?: string;
  /** 反馈弹窗文案 */
  feedbackLabels: {
    title: string;
    description: string;
    contentLabel: string;
    contentPlaceholder: string;
    contactLabel: string;
    contactPlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
  };
}

/**
 * 游戏工具栏：836x64，紧跟 iframe 下方。
 * - 左：游戏 icon + 名字 + 制作方
 * - 右：全屏按钮 + 点赞 + 点踩
 */
export function GameToolbar({
  slug,
  gameId,
  coverImage,
  title,
  creator,
  initialLiked,
  initialLikeCount,
  initialDisliked,
  initialDislikeCount,
  accent = "#7c3aed",
  feedbackLabels,
}: GameToolbarProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [liked, setLiked] = useState(initialLiked);
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [disliked, setDisliked] = useState(initialDisliked);
  const [dislikeCount, setDislikeCount] = useState(initialDislikeCount);
  const [pending, startTransition] = useTransition();

  function toggleFullscreen() {
    const el = document.getElementById("game-player-container");
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setFullscreen(false);
      analytics.platform("toolbar_button_click", {
        button: "fullscreen",
        action: "exit",
        slug,
      });
    } else {
      el.requestFullscreen();
      setFullscreen(true);
      analytics.platform("toolbar_button_click", {
        button: "fullscreen",
        action: "enter",
        slug,
      });
    }
  }

  async function onToggleLike() {
    if (pending) return;
    const prevLiked = liked;
    const prevCount = likeCount;
    analytics.platform("toolbar_button_click", {
      button: "like",
      action: liked ? "unlike" : "like",
      slug,
    });
    // 乐观更新
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? Math.max(0, prevCount - 1) : prevCount + 1);
    // 如果点踩了，取消点踩
    if (disliked) {
      setDisliked(false);
      setDislikeCount(Math.max(0, dislikeCount - 1));
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/games/${slug}/like`, { method: "POST" });
        const data = (await res.json()) as {
          success?: boolean;
          data?: { liked: boolean; likeCount: number };
          error?: { message?: string };
        };
        if (!res.ok || !data.success || !data.data) {
          setLiked(prevLiked);
          setLikeCount(prevCount);
          toast.error(data?.error?.message ?? "操作失败");
          return;
        }
        setLiked(data.data.liked);
        setLikeCount(data.data.likeCount);
      } catch {
        setLiked(prevLiked);
        setLikeCount(prevCount);
        toast.error("网络错误");
      }
    });
  }

  async function onToggleDislike() {
    if (pending) return;
    const prevDisliked = disliked;
    const prevCount = dislikeCount;
    analytics.platform("toolbar_button_click", {
      button: "dislike",
      action: disliked ? "undislike" : "dislike",
      slug,
    });
    // 乐观更新
    setDisliked(!prevDisliked);
    setDislikeCount(prevDisliked ? Math.max(0, prevCount - 1) : prevCount + 1);
    // 如果点赞了，取消点赞
    if (liked) {
      setLiked(false);
      setLikeCount(Math.max(0, likeCount - 1));
    }

    startTransition(async () => {
      try {
        const res = await fetch(`/api/games/${slug}/dislike`, { method: "POST" });
        const data = (await res.json()) as {
          success?: boolean;
          data?: { disliked: boolean; dislikeCount: number };
          error?: { message?: string };
        };
        if (!res.ok || !data.success || !data.data) {
          setDisliked(prevDisliked);
          setDislikeCount(prevCount);
          toast.error(data?.error?.message ?? "操作失败");
          return;
        }
        setDisliked(data.data.disliked);
        setDislikeCount(data.data.dislikeCount);
      } catch {
        setDisliked(prevDisliked);
        setDislikeCount(prevCount);
        toast.error("网络错误");
      }
    });
  }

  return (
    <div
      className="flex items-center justify-between bg-card px-4"
      style={{ width: 836, height: 64 }}
    >
      {/* 左：游戏 icon + 名字 + 制作方 */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="size-10 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted">
          {coverImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImage} alt="" className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-lg">🎮</div>
          )}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{creator}</p>
        </div>
      </div>

      {/* 右：反馈 + 点赞 + 点踩 + 全屏 */}
      <div className="flex items-center gap-1.5">
        {/* 反馈（点赞按钮左边） */}
        <FeedbackDialog
          type="game"
          gameId={gameId}
          gameTitle={title}
          labels={feedbackLabels}
          trigger={
            <button
              type="button"
              onClick={() =>
                analytics.platform("toolbar_button_click", {
                  button: "feedback",
                  slug,
                })
              }
              className="btn-press inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="feedback"
            >
              <MessageSquare className="size-4" />
            </button>
          }
        />

        {/* 点赞 */}
        <button
          type="button"
          onClick={onToggleLike}
          disabled={pending}
          className={cn(
            "btn-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            liked
              ? "text-white shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
          style={liked ? { backgroundColor: accent } : undefined}
        >
          <ThumbsUp className="size-3.5" fill={liked ? "currentColor" : "none"} />
          <span>{likeCount}</span>
        </button>

        {/* 点踩 */}
        <button
          type="button"
          onClick={onToggleDislike}
          disabled={pending}
          className={cn(
            "btn-press inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
            disliked
              ? "bg-red-500/10 text-red-600 shadow-sm"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <ThumbsDown className="size-3.5" fill={disliked ? "currentColor" : "none"} />
          <span>{dislikeCount}</span>
        </button>

        {/* 全屏 */}
        <button
          type="button"
          onClick={toggleFullscreen}
          className="btn-press inline-flex items-center justify-center rounded-full p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="fullscreen"
        >
          {fullscreen ? (
            <Minimize className="size-4" />
          ) : (
            <Maximize className="size-4" />
          )}
        </button>
      </div>
    </div>
  );
}
