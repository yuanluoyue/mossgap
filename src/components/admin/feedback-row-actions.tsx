"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Trash2, Loader2, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import type { FeedbackStatus } from "@/types";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface FeedbackRowActionsProps {
  id: string;
  status: FeedbackStatus;
  onView?: (id: string) => void;
}

/**
 * 反馈行操作：查看 + 标记已处理/恢复待处理 + 删除
 */
export function FeedbackRowActions({ id, status, onView }: FeedbackRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);

  const isResolved = status === "resolved";

  async function onToggleStatus() {
    if (toggling) return;
    setToggling(true);
    const next: FeedbackStatus = isResolved ? "pending" : "resolved";
    try {
      const res = await fetch(`/api/admin/feedbacks/${id}`, {
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
      toast.success(next === "resolved" ? "已标记为已处理" : "已恢复为待处理");
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
      const res = await fetch(`/api/admin/feedbacks/${id}`, { method: "DELETE" });
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
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleStatus}
            disabled={toggling}
            className={isResolved ? "text-green-600 hover:text-green-700" : "text-amber-600 hover:text-amber-700"}
          >
            {toggling ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isResolved ? (
              <RotateCcw className="size-4" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          {isResolved ? "恢复待处理" : "标记已处理"}
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
        description="删除后不可恢复。"
        confirmText={deleting ? "删除中..." : "确认删除"}
        cancelText="取消"
        variant="destructive"
        onConfirm={onConfirmDelete}
      />
    </div>
  );
}
