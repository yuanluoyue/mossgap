"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, Calendar, Gamepad2, Link2, HardDrive, Star } from "lucide-react";

import type { AdminGame } from "@/types";
import { CATEGORY_COLORS } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format";

interface GameDetailDrawerProps {
  gameId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "已发布", variant: "default" },
  draft: { label: "草稿", variant: "secondary" },
  archived: { label: "已归档", variant: "outline" },
};

const CATEGORY_LABELS: Record<string, string> = {
  action: "动作",
  puzzle: "益智",
  arcade: "街机",
  adventure: "冒险",
  strategy: "策略",
  sports: "体育",
  racing: "竞速",
  other: "其他",
};

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

/** 查看详情抽屉：点击列表行的"查看"按钮弹出 */
export function GameDetailDrawer({ gameId, open, onOpenChange }: GameDetailDrawerProps) {
  const [game, setGame] = useState<AdminGame | null>(null);
  const [loading, setLoading] = useState(false);
  // 使用 ref 跟踪已加载的 id，避免在 effect 中调用 setState
  const fetchedIdRef = useRef<string | null>(null);

  // 抽屉打开时拉取游戏详情数据（状态更新放在异步回调里，避免 effect body 同步 setState）
  useEffect(() => {
    if (!open || !gameId) return;
    if (fetchedIdRef.current === gameId) return;

    let cancelled = false;
    fetchedIdRef.current = gameId;
    // 用 microtask 触发异步状态更新，避免 effect body 同步 setState
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      setGame(null);
    });
    fetch(`/api/admin/games/${gameId}`)
      .then((r) => r.json())
      .then((data: unknown) => {
        if (cancelled) return;
        const d = data as { success?: boolean; data?: AdminGame };
        if (d.success && d.data) setGame(d.data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open, gameId]);

  // 抽屉关闭后下次再打开时，重置 ref 让其重新拉取
  function handleOpenChange(next: boolean) {
    if (!next) {
      fetchedIdRef.current = null;
      setGame(null);
      setLoading(false);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>游戏详情</DialogTitle>
          <DialogDescription>查看游戏完整信息</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">
            加载中...
          </div>
        ) : game ? (
          <div className="space-y-5">
            {/* 标题与状态 */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold">{game.title || game.slug}</h3>
                <p className="mt-1 font-mono text-xs text-muted-foreground">{game.slug}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={STATUS_LABELS[game.status]?.variant ?? "secondary"}>
                  {STATUS_LABELS[game.status]?.label ?? game.status}
                </Badge>
                {game.featured ? (
                  <Badge variant="default" className="gap-1">
                    <Star className="size-3" fill="currentColor" />
                    推荐
                  </Badge>
                ) : null}
              </div>
            </div>

            {/* 封面 */}
            {game.coverImage ? (
              <div className="overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={game.coverImage} alt={game.title} className="aspect-video w-full object-cover" />
              </div>
            ) : null}

            {/* 基本信息 */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">分类</p>
                <p className="mt-1">
                  <span
                    className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold text-white"
                    style={{ backgroundColor: CATEGORY_COLORS[game.category] ?? CATEGORY_COLORS.other }}
                  >
                    {CATEGORY_LABELS[game.category] ?? game.category}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">来源</p>
                <p className="mt-1 inline-flex items-center gap-1.5">
                  {game.sourceType === "iframe" ? (
                    <Link2 className="size-3.5" />
                  ) : (
                    <Gamepad2 className="size-3.5" />
                  )}
                  {game.sourceType === "iframe" ? "iframe 外链" : "ZIP 上传"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">游玩次数</p>
                <p className="mt-1 inline-flex items-center gap-1.5">
                  <Eye className="size-3.5" />
                  {game.playCount}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">点赞数</p>
                <p className="mt-1">{game.likeCount}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">OSS 占用</p>
                <p className="mt-1 inline-flex items-center gap-1.5">
                  <HardDrive className="size-3.5" />
                  {formatBytes(game.ossSize)}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">创建时间</p>
                <p className="mt-1 inline-flex items-center gap-1.5">
                  <Calendar className="size-3.5" />
                  {formatDate(game.createdAt)}
                </p>
              </div>
            </div>

            <Separator />

            {/* 简介 */}
            {game.description ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">简介</p>
                <p className="mt-2 whitespace-pre-line text-sm">{game.description}</p>
              </div>
            ) : null}

            {/* 多语言标题/描述 */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground">English</p>
                <p className="mt-1 text-sm font-medium">{game.locale.en.title || "—"}</p>
                <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                  {game.locale.en.description || "—"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs font-semibold text-muted-foreground">中文</p>
                <p className="mt-1 text-sm font-medium">{game.locale.zh.title || "—"}</p>
                <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">
                  {game.locale.zh.description || "—"}
                </p>
              </div>
            </div>

            {/* 玩法说明 */}
            {game.howToPlay.en || game.howToPlay.zh ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">玩法说明</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-2">
                  <p className="whitespace-pre-line text-xs">{game.howToPlay.en || "—"}</p>
                  <p className="whitespace-pre-line text-xs">{game.howToPlay.zh || "—"}</p>
                </div>
              </div>
            ) : null}

            {/* iframe URL */}
            {game.sourceType === "iframe" && game.iframeUrl ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">iframe URL</p>
                <p className="mt-1 break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">
                  {game.iframeUrl}
                </p>
              </div>
            ) : null}

            {/* OSS 路径 */}
            {game.sourceType === "zip" && game.ossPrefix ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">OSS 路径</p>
                <p className="mt-1 break-all rounded bg-muted px-2 py-1.5 font-mono text-xs">
                  {game.ossPrefix}/{game.entryFile}
                </p>
              </div>
            ) : null}

            {/* 截图 */}
            {game.screenshots && game.screenshots.length > 0 ? (
              <div>
                <p className="text-xs font-semibold text-muted-foreground">截图</p>
                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {game.screenshots.map((s, i) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={i}
                      src={s}
                      alt={`screenshot-${i + 1}`}
                      className="aspect-video w-full rounded border object-cover"
                    />
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="py-12 text-center text-sm text-muted-foreground">
            加载失败
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
