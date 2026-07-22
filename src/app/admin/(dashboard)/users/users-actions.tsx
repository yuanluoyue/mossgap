"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, KeyRound } from "lucide-react";

import type { AdminUser, AdminRole } from "@/db/queries";
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

interface UsersActionsProps {
  mode: "create" | "edit";
  user?: AdminUser;
  roles: AdminRole[];
  currentUserId: string;
}

export function UsersActions({ mode, user, roles, currentUserId }: UsersActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [username, setUsername] = useState(user?.username ?? "");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [name, setName] = useState(user?.name ?? "");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [roleId, setRoleId] = useState(user?.roleId ?? "");
  const [showPassword, setShowPassword] = useState(false);

  const isSelf = mode === "edit" && user?.id === currentUserId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        username,
        email: email || null,
        name: name || null,
        isActive,
        roleId,
      };
      if (mode === "create") {
        body.password = password;
      } else if (password && password.length > 0) {
        body.password = password;
      }

      const res = mode === "create"
        ? await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/admin/users/${user!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "保存失败");
        return;
      }
      toast.success(mode === "create" ? "已创建用户" : "已更新用户");
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
      const res = await fetch(`/api/admin/users/${user!.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
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

  if (mode === "create") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 size-4" />
          新增用户
        </Button>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增用户</DialogTitle>
            <DialogDescription>创建管理员并分配角色</DialogDescription>
          </DialogHeader>
          <UserFormBody
            mode={mode}
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            email={email}
            setEmail={setEmail}
            name={name}
            setName={setName}
            isActive={isActive}
            setIsActive={setIsActive}
            roleId={roleId}
            setRoleId={setRoleId}
            roles={roles}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            onSubmit={handleSubmit}
            submitting={submitting}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <ActionButton
          icon={Pencil}
          label={isSelf ? "编辑（当前账号）" : "编辑"}
          onClick={() => setOpen(true)}
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑用户</DialogTitle>
            <DialogDescription>修改 &quot;{user!.username}&quot; 的信息</DialogDescription>
          </DialogHeader>
          <UserFormBody
            mode={mode}
            username={username}
            setUsername={setUsername}
            password={password}
            setPassword={setPassword}
            email={email}
            setEmail={setEmail}
            name={name}
            setName={setName}
            isActive={isActive}
            setIsActive={setIsActive}
            roleId={roleId}
            setRoleId={setRoleId}
            roles={roles}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            onSubmit={handleSubmit}
            submitting={submitting}
            onCancel={() => setOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 不能删除自己：禁用删除按钮 */}
      {isSelf ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button variant="destructive" size="icon" disabled>
                <Trash2 className="size-4" />
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent>不能对自己进行删除操作</TooltipContent>
        </Tooltip>
      ) : (
        <ActionButton
          icon={Trash2}
          label="删除"
          variant="destructive"
          onClick={() => setDeleteOpen(true)}
        />
      )}

      {!isSelf && (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="删除用户"
          description={`确定要删除用户 "${user!.username}" 吗？此操作不可撤销。`}
          confirmText="删除"
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ─── 行内状态切换 Switch ──────────────────────────────────

interface UserStatusSwitchProps {
  userId: string;
  isActive: boolean;
  disabled?: boolean;
}

export function UserStatusSwitch({ userId, isActive, disabled }: UserStatusSwitchProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(isActive);
  const [saving, setSaving] = useState(false);

  async function handleToggle(value: boolean) {
    setSaving(true);
    const prev = checked;
    setChecked(value);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: value }),
      });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
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
    <Switch
      checked={checked}
      disabled={disabled || saving}
      onCheckedChange={handleToggle}
      size="sm"
    />
  );
}

interface UserFormBodyProps {
  mode: "create" | "edit";
  username: string;
  setUsername: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  name: string;
  setName: (v: string) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  roleId: string;
  setRoleId: (v: string) => void;
  roles: AdminRole[];
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  onCancel: () => void;
}

function UserFormBody(props: UserFormBodyProps) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="user-username">用户名 *</Label>
        <Input
          id="user-username"
          value={props.username}
          onChange={(e) => props.setUsername(e.target.value)}
          required
          minLength={2}
          maxLength={64}
          pattern="[a-zA-Z0-9_]+"
          placeholder="只支持字母、数字和下划线"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="user-password">
          {props.mode === "create" ? "密码 *" : "新密码"}
        </Label>
        <div className="flex gap-2">
          <Input
            id="user-password"
            type={props.showPassword ? "text" : "password"}
            value={props.password}
            onChange={(e) => props.setPassword(e.target.value)}
            required={props.mode === "create"}
            minLength={props.password.length > 0 ? 6 : undefined}
            placeholder={props.mode === "edit" ? "留空表示不修改密码" : "至少 6 位"}
          />
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => props.setShowPassword(!props.showPassword)}
            title={props.showPassword ? "隐藏密码" : "显示密码"}
          >
            <KeyRound className="size-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">昵称</Label>
          <Input
            id="user-name"
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
            maxLength={64}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-email">邮箱</Label>
          <Input
            id="user-email"
            type="email"
            value={props.email}
            onChange={(e) => props.setEmail(e.target.value)}
            maxLength={255}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>角色 *</Label>
          <Select value={props.roleId} onValueChange={props.setRoleId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="请选择角色" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {props.roles.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch
            checked={props.isActive}
            onCheckedChange={props.setIsActive}
            id="user-active"
          />
          <Label htmlFor="user-active" className="cursor-pointer text-sm">
            启用
          </Label>
        </div>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={props.onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={props.submitting}>
          {props.submitting ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}
