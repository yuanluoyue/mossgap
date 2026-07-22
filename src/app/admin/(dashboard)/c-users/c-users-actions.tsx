"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Coins, Loader2, Pencil, Trash2 } from "lucide-react";

import type { AdminCUser, PointLogItem } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime } from "@/lib/format";

interface CUsersActionsProps {
  user: AdminCUser;
}

export function CUsersActions({ user }: CUsersActionsProps) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [pointsOpen, setPointsOpen] = useState(false);
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

      <ActionButton
        icon={Coins}
        label="积分"
        onClick={() => setPointsOpen(true)}
      />

      <CUserPointsDialog
        user={user}
        open={pointsOpen}
        onOpenChange={setPointsOpen}
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
                  <SelectContent position="popper" sideOffset={4}>
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

// ─── 积分管理对话框 ──────────────────────────────────

interface CUserPointsDialogProps {
  user: AdminCUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function CUserPointsDialog({
  user,
  open,
  onOpenChange,
}: CUserPointsDialogProps) {
  const router = useRouter();
  const [balance, setBalance] = useState<number>(user.pointBalance);
  const [logs, setLogs] = useState<PointLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 5;

  const [change, setChange] = useState("");
  const [remark, setRemark] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchLogs = useCallback(async (p: number) => {
    setLogsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/c-users/${user.id}/points?page=${p}&pageSize=${pageSize}`,
      );
      const json = (await res.json()) as {
        success?: boolean;
        data?: { items: PointLogItem[]; total: number; balance: number };
      };
      if (res.ok && json.success && json.data) {
        setLogs(json.data.items);
        setTotal(json.data.total);
        setBalance(json.data.balance);
      }
    } catch {
      // 静默失败
    } finally {
      setLogsLoading(false);
    }
  }, [user.id]);

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (next) {
      // 重置表单与分页，并拉取首页日志
      setBalance(user.pointBalance);
      setPage(1);
      setChange("");
      setRemark("");
      setLogs([]);
      setTotal(0);
      void fetchLogs(1);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(change);
    if (!Number.isFinite(n) || n === 0) {
      toast.error("变动值必须是非 0 数字");
      return;
    }
    if (n < -1000000 || n > 1000000) {
      toast.error("变动值超出范围");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/c-users/${user.id}/points`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          change: Math.trunc(n),
          remark: remark.trim() || null,
        }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        data?: { balance: number };
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "调整失败");
        return;
      }
      toast.success("积分已调整");
      setChange("");
      setRemark("");
      setBalance(json.data?.balance ?? balance);
      router.refresh();
      // 重新拉取日志
      await fetchLogs(1);
      setPage(1);
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="size-5 text-amber-500" />
            积分管理
          </DialogTitle>
          <DialogDescription>
            {user.email || user.name || user.id} 的积分余额与变动记录。手动调整会写操作日志。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* 余额展示 */}
          <div className="rounded-lg border bg-muted/30 p-4">
            <p className="text-xs text-muted-foreground">当前余额</p>
            <p className="mt-1 text-3xl font-bold tabular-nums">
              {balance.toLocaleString()}
            </p>
          </div>

          {/* 调整表单 */}
          <form onSubmit={handleAdjust} className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[180px_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor="pt-change">变动值</Label>
                <Input
                  id="pt-change"
                  type="number"
                  inputMode="numeric"
                  value={change}
                  onChange={(e) => setChange(e.target.value)}
                  placeholder="正数增加，负数扣减"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pt-remark">备注（选填）</Label>
                <Input
                  id="pt-remark"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  maxLength={500}
                  placeholder="说明此次调整原因"
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {submitting ? "提交中..." : "提交调整"}
              </Button>
            </div>
          </form>

          {/* 日志列表 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">变动记录</h4>
              <span className="text-xs text-muted-foreground">
                共 {total} 条
              </span>
            </div>
            <div className="rounded-lg border">
              {logsLoading && logs.length === 0 ? (
                <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  加载中...
                </div>
              ) : logs.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  暂无积分记录
                </div>
              ) : (
                <ul className="divide-y">
                  {logs.map((log) => (
                    <li
                      key={log.id}
                      className="flex items-start gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="text-[10px]"
                          >
                            {logTypeLabel(log.type)}
                          </Badge>
                          {log.bizType ? (
                            <Badge
                              variant="outline"
                              className="text-[10px]"
                            >
                              {log.bizType}
                            </Badge>
                          ) : null}
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                        {log.remark ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {log.remark}
                          </p>
                        ) : null}
                      </div>
                      <div className="text-right">
                        <p
                          className={
                            "text-sm font-semibold tabular-nums " +
                            (log.change > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : "text-red-600 dark:text-red-400")
                          }
                        >
                          {log.change > 0 ? "+" : ""}
                          {log.change}
                        </p>
                        <p className="text-[10px] text-muted-foreground tabular-nums">
                          余额 {log.balanceAfter.toLocaleString()}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {totalPages > 1 ? (
              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || logsLoading}
                  onClick={() => {
                    const p = Math.max(1, page - 1);
                    setPage(p);
                    fetchLogs(p);
                  }}
                >
                  上一页
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {page} / {totalPages}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || logsLoading}
                  onClick={() => {
                    const p = Math.min(totalPages, page + 1);
                    setPage(p);
                    fetchLogs(p);
                  }}
                >
                  下一页
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function logTypeLabel(type: string): string {
  switch (type) {
    case "earn":
      return "获得";
    case "spend":
      return "消耗";
    case "adjust":
      return "调整";
    case "revoke":
      return "撤销";
    default:
      return type;
  }
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
