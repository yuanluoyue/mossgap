"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 亮暗模式切换按钮。
 *
 * - 已挂载前不渲染内容（避免 SSR/CSR 主题不一致导致的 hydration mismatch）
 * - 已有快捷键 `d`（见 theme-provider.tsx），按钮只是补充可视化入口
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    // 延迟到 microtask 避免在 effect 同步上下文中调用 setState
    Promise.resolve().then(() => setMounted(true));
  }, []);

  const isDark = resolvedTheme === "dark";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          // 在 mounted 之前保持稳定结构，避免 hydration mismatch
          suppressHydrationWarning
        >
          {/* 用同样占位的 Sun/Moon 渲染保持 layout 稳定，等客户端挂载后再切换图标 */}
          {!mounted ? (
            <Sun className="size-4" />
          ) : isDark ? (
            <Sun className="size-4" />
          ) : (
            <Moon className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {mounted ? (isDark ? "浅色模式" : "深色模式") : "切换主题"}
      </TooltipContent>
    </Tooltip>
  );
}
