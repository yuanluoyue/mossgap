"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

import type { AdminEgg } from "@/types";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

export function EggsActions({ egg }: { egg: AdminEgg }) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/eggs/${egg.id}`, { method: "DELETE" });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除蛋");
      setDeleteOpen(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  const label = `G${egg.generation} · ${egg.status}`;

  return (
    <div>
      <ActionButton
        icon={Trash2}
        label="删除"
        variant="destructive"
        disabled={submitting}
        onClick={() => setDeleteOpen(true)}
      />
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除蛋"
        description={`确定要删除蛋 "${label}" 吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}
