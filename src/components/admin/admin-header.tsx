"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AdminHeaderProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
}

interface MeUser {
  id: string;
  username: string;
  email: string | null;
  name: string | null;
  avatar: string | null;
  role: { id: string; name: string; code: string } | null;
}

export function AdminHeader({ collapsed, onToggleCollapse }: AdminHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const [user, setUser] = useState<MeUser | null>(null);

  async function loadMe() {
    try {
      const res = await fetch("/api/admin/me", { cache: "no-store" });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (json.success && json.data?.authenticated && json.data?.user) {
        setUser(json.data.user);
      }
    } catch {
      // 静默失败
    }
  }

  useEffect(() => {
    loadMe();
    // 监听 profile 更新事件（profile-form 修改资料/头像后触发）
    const handler = () => loadMe();
    window.addEventListener("profile-updated", handler);
    return () => window.removeEventListener("profile-updated", handler);
  }, []);

  async function handleLogout() {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      toast.success("已退出登录");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      toast.error("退出失败");
    }
  }

  const displayName = user?.name || user?.username || "admin";
  const roleName = user?.role?.name;

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-4">
      <Button
        variant="ghost"
        size="icon"
        onClick={onToggleCollapse}
        title="切换侧边栏"
      >
        {collapsed ? (
          <PanelLeft className="size-4" />
        ) : (
          <PanelLeftClose className="size-4" />
        )}
      </Button>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
          title="切换主题"
        >
          <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
          <span className="sr-only">切换主题</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted">
              <Avatar size="sm">
                {user?.avatar ? (
                  <AvatarImage src={user.avatar} alt={displayName} />
                ) : null}
                <AvatarFallback>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col gap-0.5">
                <span className="font-medium">{displayName}</span>
                {roleName && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {roleName}
                  </span>
                )}
                {user?.email && (
                  <span className="text-xs text-muted-foreground font-normal">
                    {user.email}
                  </span>
                )}
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/profile">
                <UserIcon className="mr-2 size-4" />
                个人信息
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} variant="destructive">
              <LogOut className="mr-2 size-4" />
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
