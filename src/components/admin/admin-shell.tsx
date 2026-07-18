"use client";

import { useSyncExternalStore, useCallback } from "react";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

const STORAGE_KEY = "admin_sidebar_collapsed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("mossgap:sidebar-collapse", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("mossgap:sidebar-collapse", callback);
  };
}

function getSnapshot(): boolean {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

function getServerSnapshot(): boolean {
  return false;
}

/**
 * 后台外壳：侧边栏 + 头部 + 主内容区
 * - 折叠状态持久化到 localStorage（useSyncExternalStore 订阅）
 * - 包裹 TooltipProvider（ActionButton 依赖）
 * - ThemeProvider 已在 root layout 全局挂载，此处不再重复
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const collapsed = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const handleToggleCollapse = useCallback(() => {
    const next = !collapsed;
    localStorage.setItem(STORAGE_KEY, String(next));
    // storage 事件不会在同一 window 触发，需手动派发
    window.dispatchEvent(new Event("mossgap:sidebar-collapse"));
  }, [collapsed]);

  return (
    <TooltipProvider>
      <div
        className="flex h-screen"
        style={{ ["--radius" as string]: "0.5rem" }}
      >
        <AdminSidebar collapsed={collapsed} />
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader
            collapsed={collapsed}
            onToggleCollapse={handleToggleCollapse}
          />
          <main className="flex-1 overflow-y-auto bg-muted/50 p-6">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
