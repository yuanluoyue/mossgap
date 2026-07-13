"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2 } from "lucide-react";

interface GamePlayerProps {
  src: string;
  title: string;
  loadingLabel: string;
}

/**
 * 游戏播放器：固定 836x470，参考 Poki 尺寸。
 * 全屏按钮和工具栏由外部 GameToolbar 控制。
 */
export function GamePlayer({ src, title, loadingLabel }: GamePlayerProps) {
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
      className="relative overflow-hidden"
      style={{ width: 836, height: 470 }}
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
