"use client";

import { useState, useEffect } from "react";

import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AdminSidebar } from "@/components/admin/sidebar";
import { AdminHeader } from "@/components/admin/admin-header";

/**
 * 后台外壳：侧边栏 + 头部 + 主内容区
 * - 折叠状态持久化到 localStorage
 * - 包裹 ThemeProvider（仅后台启用 next-themes 主题切换）
 * - 包裹 TooltipProvider（ActionButton 依赖）
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("admin_sidebar_collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function handleToggleCollapse() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("admin_sidebar_collapsed", String(next));
      return next;
    });
  }

  return (
    <ThemeProvider>
      <TooltipProvider>
        <div className="flex h-screen">
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
    </ThemeProvider>
  );
}
