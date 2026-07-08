"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SettingItem {
  id: string;
  key: string;
  value: string;
  remark: string;
  updatedAt: string;
}

interface SettingsActionsProps {
  mode: "create" | "edit";
  item?: SettingItem;
}

export function SettingsActions({ mode, item }: SettingsActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单状态
  const [key, setKey] = useState(item?.key ?? "");
  const [value, setValue] = useState(item?.value ?? "");
  const [remark, setRemark] = useState(item?.remark ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = { key, value, remark };
      const res = mode === "create"
        ? await fetch("/api/admin/settings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/settings/${item!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "保存失败");
        return;
      }
      toast.success(mode === "create" ? "已创建配置" : "已更新配置");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/settings/${item!.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除配置");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "create") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-1 size-4" />
            新增配置
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增配置</DialogTitle>
            <DialogDescription>添加一条系统配置（键值对）</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setting-key">键 *</Label>
              <Input
                id="setting-key"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="如 site.title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setting-value">值</Label>
              <Textarea
                id="setting-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={4}
                placeholder="配置值"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setting-remark">备注</Label>
              <Input
                id="setting-remark"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="可选说明"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <ActionButton
          icon={Pencil}
          label="编辑"
          onClick={() => setOpen(true)}
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑配置</DialogTitle>
            <DialogDescription>修改配置 &quot;{item!.key}&quot;</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="setting-key-edit">键 *</Label>
              <Input
                id="setting-key-edit"
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setting-value-edit">值</Label>
              <Textarea
                id="setting-value-edit"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="setting-remark-edit">备注</Label>
              <Input
                id="setting-remark-edit"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? "保存中..." : "保存"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ActionButton
        icon={Trash2}
        label="删除"
        variant="destructive"
        onClick={() => setDeleteOpen(true)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除配置"
        description={`确定要删除配置 "${item!.key}" 吗？此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}
