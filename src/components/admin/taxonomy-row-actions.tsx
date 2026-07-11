"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface TaxonomyRowActionsProps {
  id: string;
  isVisible: boolean;
  /** API 基础路径，例如 "/api/admin/categories" */
  apiBase: string;
  /** 点击编辑回调（由父组件打开编辑弹窗） */
  onEdit: () => void;
  /** 删除确认弹窗的描述文字 */
  deleteDescription?: string;
}

/**
 * 分类 / 标签 / 专题 通用的行操作组件。
 * - 编辑：调用 onEdit 回调（由父组件控制弹窗）
 * - 显示/隐藏：PATCH apiBase/[id] { isVisible: !isVisible }
 * - 删除：DELETE apiBase/[id]（带 ConfirmDialog 确认）
 *
 * 操作按钮优先使用 icon，hover 时 Tooltip 显示描述文字。
 */
export function TaxonomyRowActions({
  id,
  isVisible,
  apiBase,
  onEdit,
  deleteDescription = "删除后不可恢复。",
}: TaxonomyRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, startTransition] = useTransition();

  async function onToggleVisible() {
    if (toggling) return;
    const next = !isVisible;
    const label = next ? "显示" : "隐藏";
    startTransition(async () => {
      try {
        const res = await fetch(`${apiBase}/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isVisible: next }),
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

  async function onConfirmDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`${apiBase}/${id}`, { method: "DELETE" });
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
      {/* 编辑 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="size-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">编辑</TooltipContent>
      </Tooltip>

      {/* 显示 / 隐藏 */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleVisible}
            disabled={toggling}
          >
            {toggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isVisible ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isVisible ? "隐藏" : "显示"}
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
        description={deleteDescription}
        confirmText={deleting ? "删除中..." : "确认删除"}
        cancelText="取消"
        variant="destructive"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
