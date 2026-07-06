"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Moon,
  Sun,
  PanelLeftClose,
  PanelLeft,
  LogOut,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Avatar,
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

export function AdminHeader({ collapsed, onToggleCollapse }: AdminHeaderProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  // 当前后台仅 admin 单账号，直接展示静态文案
  const displayName = "admin";

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
                <AvatarFallback>
                  {displayName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[120px] truncate">{displayName}</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>{displayName}</DropdownMenuLabel>
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
