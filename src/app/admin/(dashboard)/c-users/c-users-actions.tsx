"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2 } from "lucide-react";

import type { AdminCUser } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActionButton } from "@/components/admin/action-button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CUsersActionsProps {
  user: AdminCUser;
}

export function CUsersActions({ user }: CUsersActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(user.name ?? "");
  const [locale, setLocale] = useState(user.locale);
  const [isActive, setIsActive] = useState(user.isActive);

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/c-users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name || null,
          locale,
          isActive,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "保存失败");
        return;
      }
      toast.success("已更新用户");
      setEditOpen(false);
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
      const res = await fetch(`/api/admin/c-users/${user.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除用户");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton
        icon={Pencil}
        label="编辑"
        onClick={() => setEditOpen(true)}
      />

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑 C 端用户</DialogTitle>
            <DialogDescription>
              修改用户昵称、语言和状态。禁用用户会立即撤销其全部登录会话。
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cuser-email">邮箱（只读）</Label>
              <Input
                id="cuser-email"
                value={user.email ?? ""}
                disabled
                placeholder="—"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cuser-name">昵称</Label>
              <Input
                id="cuser-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={64}
                placeholder="留空表示不设置昵称"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>语言</Label>
                <Select value={locale} onValueChange={setLocale}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="语言" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="zh">中文</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end gap-2 pb-1">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  id="cuser-active"
                />
                <Label
                  htmlFor="cuser-active"
                  className="cursor-pointer text-sm"
                >
                  启用
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
              >
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
        title="删除 C 端用户"
        description={`确定要删除用户 "${user.email || user.name || user.id}" 吗？该用户的所有登录账号和会话将被一并删除，此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── 行内状态切换 Switch ──────────────────────────────────

interface CUserStatusSwitchProps {
  userId: string;
  isActive: boolean;
}

export function CUserStatusSwitch({
  userId,
  isActive,
}: CUserStatusSwitchProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(isActive);
  const [saving, setSaving] = useState(false);

  async function handleToggle(value: boolean) {
    setSaving(true);
    const prev = checked;
    setChecked(value);
    try {
      const res = await fetch(`/api/admin/c-users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: value }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        setChecked(prev);
        toast.error(json.error?.message ?? "更新失败");
        return;
      }
      toast.success(value ? "已启用" : "已停用");
      router.refresh();
    } catch {
      setChecked(prev);
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Switch
            checked={checked}
            disabled={saving}
            onCheckedChange={handleToggle}
            size="sm"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        {checked ? "点击停用" : "点击启用"}
      </TooltipContent>
    </Tooltip>
  );
}
