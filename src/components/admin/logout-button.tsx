"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

interface AdminLogoutButtonProps {
  /** 折叠模式：仅显示图标 */
  collapsed?: boolean;
}

export function AdminLogoutButton({ collapsed = false }: AdminLogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onLogout() {
    if (loading) return;
    setLoading(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
      toast.success("已退出登录");
      router.replace("/admin/login");
      router.refresh();
    } catch {
      toast.error("退出失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onLogout}
      disabled={loading}
      title={collapsed ? "退出登录" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50",
        collapsed && "justify-center px-0",
      )}
    >
      {loading ? (
        <Loader2 className="size-4 shrink-0 animate-spin" />
      ) : (
        <LogOut className="size-4 shrink-0" />
      )}
      {!collapsed && "退出登录"}
    </button>
  );
}
