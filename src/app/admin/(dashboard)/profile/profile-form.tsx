"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, Save, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/format";

interface ProfileFormProps {
  user: {
    id: string;
    username: string;
    email: string | null;
    name: string | null;
    avatar: string | null;
    createdAt: number;
  };
  roleName: string;
}

export function ProfileForm({ user, roleName }: ProfileFormProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name ?? "");
  const [email, setEmail] = useState(user.email ?? "");
  const [avatar, setAvatar] = useState(user.avatar ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // 修改密码弹窗
  const [pwdOpen, setPwdOpen] = useState(false);
  const [oldPwd, setOldPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email: email || null }),
      });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "保存失败");
        return;
      }
      toast.success("资料已更新");
      // 通知头部组件刷新
      window.dispatchEvent(new Event("profile-updated"));
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/admin/avatar", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "头像上传失败");
        return;
      }
      setAvatar(json.data.url);
      toast.success("头像已更新");
      window.dispatchEvent(new Event("profile-updated"));
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setUploadingAvatar(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPwd !== confirmPwd) {
      toast.error("两次输入的新密码不一致");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch("/api/admin/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldPassword: oldPwd,
          newPassword: newPwd,
          confirmPassword: confirmPwd,
        }),
      });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "修改失败");
        return;
      }
      toast.success("密码已修改");
      setPwdOpen(false);
      setOldPwd("");
      setNewPwd("");
      setConfirmPwd("");
    } catch {
      toast.error("网络错误");
    } finally {
      setPwdSaving(false);
    }
  }

  const displayName = name || user.username;

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* 左：头像 + 基本信息 */}
      <Card className="lg:col-span-1">
        <CardHeader>
          <CardTitle>账号信息</CardTitle>
          <CardDescription>只读的账号基本信息</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 头像 */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative">
              <Avatar size="lg" className="size-20">
                {avatar ? (
                  <AvatarImage src={avatar} alt={displayName} />
                ) : null}
                <AvatarFallback className="text-2xl">
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute right-0 bottom-0 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow ring-2 ring-background transition-colors hover:bg-primary/90 disabled:opacity-50"
                title="更换头像"
              >
                {uploadingAvatar ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Camera className="size-3.5" />
                )}
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <p className="text-sm text-muted-foreground">点击相机图标更换头像</p>
          </div>

          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-muted-foreground">用户名</dt>
              <dd className="font-medium">{user.username}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">角色</dt>
              <dd className="font-medium">{roleName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">注册时间</dt>
              <dd className="font-medium">{formatDate(new Date(user.createdAt * 1000).toISOString())}</dd>
            </div>
          </dl>

          <Button variant="outline" className="w-full" onClick={() => setPwdOpen(true)}>
            <KeyRound className="mr-2 size-4" />
            修改密码
          </Button>
        </CardContent>
      </Card>

      {/* 右：编辑表单 */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>资料编辑</CardTitle>
          <CardDescription>更新昵称和邮箱</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="profile-name">昵称</Label>
              <Input
                id="profile-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="昵称"
                maxLength={64}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">邮箱</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@example.com"
                maxLength={255}
              />
            </div>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {saving ? "保存中..." : "保存资料"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 修改密码弹窗 */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>修改密码</DialogTitle>
            <DialogDescription>请输入原密码和新密码</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="old-password">原密码</Label>
              <Input
                id="old-password"
                type="password"
                value={oldPwd}
                onChange={(e) => setOldPwd(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">新密码</Label>
              <Input
                id="new-password"
                type="password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">确认新密码</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                required
                minLength={6}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setPwdOpen(false)}>
                取消
              </Button>
              <Button type="submit" disabled={pwdSaving}>
                {pwdSaving ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {pwdSaving ? "修改中..." : "确认修改"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
