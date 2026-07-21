"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  Play,
  Pencil,
  FileText,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { GamePlayer } from "@/components/game-player";
import { GameBasicInfoDrawer } from "@/components/admin/game-basic-info-drawer";
import { GameContentDrawer } from "@/components/admin/game-content-drawer";

interface GameRowActionsProps {
  id: string;
  slug: string;
  status: string;
  title: string;
  /** 游戏可预览的 URL（zip 解压后的 index.html 完整地址，或 iframe URL） */
  playUrl: string;
  categories: { id: string; slug: string; name: string; color: string | null }[];
  tags: { id: string; slug: string; name: string; color: string | null }[];
  collections: { id: string; slug: string; name: string }[];
  /** 初次挂载时是否打开基本信息抽屉（用于从仪表盘跳转过来时自动打开） */
  initialBasicOpen?: boolean;
}

/**
 * 游戏行操作：预览 + 编辑基本信息 + 编辑详情 + 上架/下架 + 删除
 *
 * 编辑基本信息与详情均通过侧边抽屉（Sheet）打开，不再跳转独立页面。
 * 操作按钮优先使用 icon，hover 时 Tooltip 显示描述文字。
 */
export function GameRowActions({
  id,
  slug,
  status,
  title,
  playUrl,
  categories,
  tags,
  collections,
  initialBasicOpen = false,
}: GameRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [basicOpen, setBasicOpen] = useState(initialBasicOpen);
  const [contentOpen, setContentOpen] = useState(false);
  const [toggling, startTransition] = useTransition();

  // 从仪表盘带 ?edit=id 跳转过来时，挂载后清掉 URL 中的 edit 参数，
  // 避免后续刷新或保存触发抽屉重开。
  useEffect(() => {
    if (!initialBasicOpen) return;
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("edit")) return;
    url.searchParams.delete("edit");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [initialBasicOpen, router]);

  // 预览弹窗打开时：ESC 关闭 + 锁定 body 滚动。
  // 不用 Radix Dialog 是因为 Dialog 的 transform 居中会创建额外 compositing layer，
  // 导致 iframe 内游戏渲染掉帧（Chromium 已知行为）。
  useEffect(() => {
    if (!previewOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPreviewOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [previewOpen]);

  async function onConfirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/games/${id}`, { method: "DELETE" });
      const data = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !data.success) {
        toast.error(data?.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setDeleting(false);
    }
  }

  /** 上架/下架：published ↔ draft */
  function onTogglePublish() {
    if (toggling) return;
    const next = status === "published" ? "draft" : "published";
    const label = next === "published" ? "上架" : "下架";
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/games/${id}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: next }),
        });
        const data = (await res.json()) as {
          success?: boolean;
          error?: { message?: string };
        };
        if (!res.ok || !data.success) {
          toast.error(data?.error?.message ?? `${label}失败`);
          return;
        }
        toast.success(`${label}成功`);
        router.refresh();
      } catch {
        toast.error("网络错误");
      }
    });
  }

  const isPublished = status === "published";

  return (
    <div className="flex items-center justify-end gap-1">
      {/* 预览 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setPreviewOpen(true)}
            disabled={!playUrl}
          >
            <Play className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">预览</TooltipContent>
      </Tooltip>

      {/* 编辑基本信息（抽屉） */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setBasicOpen(true)}
          >
            <Pencil className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">编辑基本信息</TooltipContent>
      </Tooltip>

      {/* 编辑详情内容（抽屉） */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setContentOpen(true)}
          >
            <FileText className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">编辑详情（攻略/SEO）</TooltipContent>
      </Tooltip>

      {/* 上架 / 下架 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePublish}
            disabled={toggling}
          >
            {toggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isPublished ? (
              <EyeOff className="size-4" />
            ) : (
              <Eye className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isPublished ? "下架" : "上架"}
        </TooltipContent>
      </Tooltip>

      {/* 删除 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">删除</TooltipContent>
      </Tooltip>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={(o) => !deleting && setDeleteOpen(o)}
        title="确认删除？"
        description="删除后不可恢复，OSS 上的游戏资源也会一并清除。"
        confirmText={deleting ? "删除中..." : "确认删除"}
        cancelText="取消"
        variant="destructive"
        onConfirm={onConfirmDelete}
      />

      {/* 预览弹窗：自定义 fixed overlay（不用 Radix Dialog）。
          原因：Radix Dialog 用 transform 居中 + zoom-in 动画，
          会创建额外 compositing layer，导致 iframe 内游戏掉帧。
          这里用 flex 居中，无 transform，iframe 走正常合成路径。 */}
      {previewOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/10 p-4 supports-backdrop-filter:backdrop-blur-xs"
          onClick={(e) => {
            // 点击遮罩（非卡片内部）关闭
            if (e.target === e.currentTarget) setPreviewOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`预览：${title}`}
            className="overflow-hidden rounded-xl bg-popover shadow-lg ring-1 ring-foreground/10"
          >
            {/* 顶部 bar：标题 + 显式关闭按钮（放在游戏 iframe 外，避免误点游戏） */}
            <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-2.5">
              <span className="truncate text-sm font-medium">{title}</span>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="关闭预览"
                onClick={() => setPreviewOpen(false)}
              >
                <X className="size-4" />
              </Button>
            </div>
            {playUrl ? (
              <div className="bg-muted/30 p-3">
                <div className="overflow-hidden rounded-lg border-2 border-border/80 shadow-sm">
                  <GamePlayer
                    src={playUrl}
                    title={title}
                    loadingLabel="加载中..."
                  />
                </div>
              </div>
            ) : (
              <div className="flex h-[470px] w-[836px] items-center justify-center text-sm text-muted-foreground">
                暂无可预览的游戏资源
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* 编辑基本信息抽屉（仅在打开时挂载，避免 N 行 N 个富文本实例） */}
      {basicOpen ? (
        <GameBasicInfoDrawer
          gameId={id}
          open={basicOpen}
          onOpenChange={setBasicOpen}
          categories={categories}
          tags={tags}
          collections={collections}
        />
      ) : null}

      {/* 编辑详情内容抽屉 */}
      {contentOpen ? (
        <GameContentDrawer
          gameId={id}
          gameSlug={slug}
          gameStatus={status}
          open={contentOpen}
          onOpenChange={setContentOpen}
        />
      ) : null}
    </div>
  );
}
