"use client";

import { useState, useCallback, useEffect } from "react";

import { cn } from "@/lib/utils";
import { GamePlayer } from "@/components/game-player";
import { GameToolbar } from "@/components/game-toolbar";

interface GamePlayerSectionProps {
  /** 游戏 iframe URL */
  src: string;
  /** 游戏标题 */
  title: string;
  /** 加载中文案 */
  loadingLabel: string;
  /** 工具栏配置（透传给 GameToolbar） */
  toolbar: Omit<
    React.ComponentProps<typeof GameToolbar>,
    "largeMode" | "onToggleLarge"
  >;
}

/** 移动端断点：≤ 639px 视为移动端，使用系统全屏 */
const MOBILE_BREAKPOINT = "(max-width: 639px)";

/**
 * 游戏播放器区域：GamePlayer + GameToolbar 组合，管理大屏模式状态。
 *
 * 两种大屏模式：
 * - 桌面端（≥640px）：剧场模式 — fixed 遮罩 + 16:9 居中放大
 *   - 点击遮罩或 ESC 键退出
 * - 移动端（<640px）：浏览器原生全屏 — requestFullscreen()
 *   - 浏览器自动处理 ESC 退出
 *
 * 区分原因：移动端剧场模式会被浏览器 UI 遮挡，原生全屏体验更好；
 * 桌面端剧场模式加载更快、退出更轻量，保留浏览器 UI 便于切换标签页。
 */
export function GamePlayerSection({
  src,
  title,
  loadingLabel,
  toolbar,
}: GamePlayerSectionProps) {
  const [theaterMode, setTheaterMode] = useState(false); // 桌面剧场模式
  const [isFullscreen, setIsFullscreen] = useState(false); // 移动端系统全屏

  // 监听系统全屏状态变化（用户可能按 ESC 退出，需同步按钮图标）
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // 剧场模式：ESC 键退出 + 锁定 body 滚动
  useEffect(() => {
    if (!theaterMode) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setTheaterMode(false);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [theaterMode]);

  const handleToggle = useCallback(() => {
    // 移动端：用浏览器原生全屏
    if (
      typeof window !== "undefined" &&
      window.matchMedia(MOBILE_BREAKPOINT).matches
    ) {
      const el = document.getElementById("game-player-container");
      if (!el) return;
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        el.requestFullscreen().catch(() => {
          // 全屏失败（如浏览器不支持）时回退到剧场模式
          setTheaterMode(true);
        });
      }
      return;
    }
    // 桌面端：剧场模式
    setTheaterMode((v) => !v);
  }, []);

  // 点击遮罩（不是游戏框内部）退出剧场模式
  function onOverlayClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget && theaterMode) {
      setTheaterMode(false);
    }
  }

  const isLarge = theaterMode || isFullscreen;

  return (
    <div
      className={cn(
        "mt-4 flex flex-col items-center transition-all",
        theaterMode &&
          "fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4",
      )}
      onClick={onOverlayClick}
    >
      <div
        className={cn(
          "overflow-hidden rounded-md shadow-sm transition-all",
          theaterMode
            ? // 剧场模式：宽度取 95vw 与 90vh*16/9 的较小值，保持 16:9 比例
              "aspect-[16/9] w-[min(95vw,calc(90vh*16/9))]"
            : "w-[95%] max-w-[836px]",
        )}
      >
        <GamePlayer
          src={src}
          title={title}
          loadingLabel={loadingLabel}
          large={isLarge}
        />
        <GameToolbar
          {...toolbar}
          largeMode={isLarge}
          onToggleLarge={handleToggle}
        />
      </div>
    </div>
  );
}
