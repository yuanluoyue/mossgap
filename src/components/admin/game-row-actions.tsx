"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
}

/**
 * 游戏行操作：编辑（链接）+ 删除（确认弹窗）
 * - 编辑：Tooltip + Button asChild 包裹 Link
 * - 删除：Tooltip + Button 触发 ConfirmDialog
 */
export function GameRowActions({ id, editHref }: GameRowActionsProps) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

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
