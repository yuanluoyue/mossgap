"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

const REMEMBER_KEY = "mossgap_admin_remember";
const USERNAME_KEY = "mossgap_admin_username";
const PASSWORD_KEY = "mossgap_admin_password";

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);

  // 进入页面时读取本地保存的账号密码（在 effect 中读取以避免 SSR hydration 不一致）
  useEffect(() => {
    try {
      if (localStorage.getItem(REMEMBER_KEY) !== "1") return;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemember(true);
      const u = localStorage.getItem(USERNAME_KEY);
      const p = localStorage.getItem(PASSWORD_KEY);
      setUsername(u ?? "");
      setPassword(p ?? "");
    } catch {
      // localStorage 不可用时静默忽略
    }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !data.success) {
        toast.error(data?.error?.message ?? "登录失败");
        return;
      }
      // 登录成功后处理记住密码
      try {
        if (remember) {
          localStorage.setItem(REMEMBER_KEY, "1");
          localStorage.setItem(USERNAME_KEY, username);
          localStorage.setItem(PASSWORD_KEY, password);
        } else {
          localStorage.removeItem(REMEMBER_KEY);
          localStorage.removeItem(USERNAME_KEY);
          localStorage.removeItem(PASSWORD_KEY);
        }
      } catch {
        // 忽略存储异常
      }
      toast.success("登录成功");
      router.replace("/admin");
      router.refresh();
    } catch {
      toast.error("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-slate-200 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.png"
            alt="MossGap"
            className="mx-auto mb-3 size-12 rounded-xl shadow-sm"
          />
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            MossGap 控制台
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            登录以管理游戏内容
          </p>
        </div>

        {/* 表单卡片 */}
        <form
          onSubmit={onSubmit}
          className="rounded-xl border bg-card p-6 shadow-sm"
        >
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">用户名</Label>
              <div className="relative">
                <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  autoComplete="username"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">密码</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                checked={remember}
                onCheckedChange={(v) => setRemember(v === true)}
              />
              <Label htmlFor="remember" className="cursor-pointer text-sm">
                记住密码
              </Label>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="h-10 w-full"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "登录"
              )}
            </Button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          MossGap Admin · 仅限授权人员访问
        </p>
      </div>
    </div>
  );
}
