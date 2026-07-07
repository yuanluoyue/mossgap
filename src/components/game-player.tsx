"use client";

import { useState } from "react";
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

  return (
    <div
      id="game-player-container"
      className="relative overflow-hidden border border-border/60 bg-black"
      style={{ width: 836, height: 470 }}
    >
      {loading ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
          <Loader2 className="size-8 animate-spin text-primary" />
          <span className="sr-only">{loadingLabel}</span>
        </div>
      ) : null}
      <iframe
        src={src}
        title={title}
        className="h-full w-full border-0"
        allow="autoplay; fullscreen; gamepad; pointer-lock; screen-wake-lock; cross-origin-isolated; xr-spatial-tracking"
        sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups allow-modals allow-presentation"
        onLoad={() => setLoading(false)}
      />
    </div>
  );
}
