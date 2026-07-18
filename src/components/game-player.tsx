"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";

interface GamePlayerProps {
  src: string;
  title: string;
  loadingLabel: string;
  /** 大屏模式：容器撑满父容器（父容器已放大） */
  large?: boolean;
}

/**
 * 游戏播放器：默认 836x470（参考 Poki 尺寸）。
 * 大屏模式由父组件控制容器尺寸，组件内部用 h-full w-full 填满。
 */
export function GamePlayer({ src, title, loadingLabel, large = false }: GamePlayerProps) {
  const [loading, setLoading] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    // 跨域 iframe 用 addEventListener 更可靠
    const handleLoad = () => setLoading(false);
    iframe.addEventListener("load", handleLoad);

    // 超时兜底：5 秒后自动隐藏 loading
    const timer = setTimeout(() => setLoading(false), 5000);

    return () => {
      iframe.removeEventListener("load", handleLoad);
      clearTimeout(timer);
    };
  }, []);

  return (
    <div
      id="game-player-container"
      className={cn(
        "relative overflow-hidden",
        large
          ? "h-full w-full"
          : "aspect-[836/470] w-full sm:h-[470px] sm:w-[836px]",
      )}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="sr-only">{loadingLabel}</span>
        </div>
      ) : null}
      <iframe
        ref={iframeRef}
        src={src}
        title={title}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; screen-wake-lock; xr-spatial-tracking"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups allow-modals allow-presentation"
      />
    </div>
  );
}
