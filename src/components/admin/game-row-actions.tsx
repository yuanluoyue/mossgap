"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Pencil,
  Trash2,
  Loader2,
  CloudUpload,
  CloudDownload,
  Eye,
} from "lucide-react";
import { toast } from "sonner";

import type { GameStatus } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface GameRowActionsProps {
  id: string;
  editHref: string;
  status: GameStatus;
  onView?: (id: string) => void;
}

/**
 * 游戏行操作：查看 + 编辑 + 上架/下架 + 删除
 * - 查看：弹出详情抽屉
 * - 编辑：跳转链接
 * - 上架/下架：调 PATCH 切换 status
 * - 删除：确认弹窗
 */
export function GameRowActions({ id, editHref, status, onView }: GameRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const isPublished = status === "published";

  async function onTogglePublish() {
    if (toggling) return;
    setToggling(true);
    const next: GameStatus = isPublished ? "draft" : "published";
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
        toast.error(data?.error?.message ?? "操作失败");
        return;
      }
      toast.success(next === "published" ? "已上架" : "已下架");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setToggling(false);
    }
  }

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

  return (
    <div className="flex items-center justify-end gap-1">
      {onView ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={() => onView(id)}>
              <Eye className="size-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">查看详情</TooltipContent>
        </Tooltip>
      ) : null}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" asChild>
            <Link href={editHref}>
              <Pencil className="size-4" />
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">编辑</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onTogglePublish}
            disabled={toggling}
            className={isPublished ? "text-amber-600 hover:text-amber-700" : "text-green-600 hover:text-green-700"}
          >
            {toggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isPublished ? (
              <CloudDownload className="size-4" />
            ) : (
              <CloudUpload className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isPublished ? "下架" : "上架"}
        </TooltipContent>
      </Tooltip>

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
    </div>
  );
}
