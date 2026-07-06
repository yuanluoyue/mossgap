"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";

interface PlayFrameProps {
  playUrl: string;
  title: string;
  exitLabel: string;
  loadingLabel: string;
  backLabel: string;
}

export function PlayFrame({
  playUrl,
  title,
  exitLabel,
  loadingLabel,
}: PlayFrameProps) {
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ESC 退出全屏
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && fullscreen) {
        document.exitFullscreen().catch(() => {});
        setFullscreen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!fullscreen) {
      containerRef.current.requestFullscreen?.().then(() => setFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setFullscreen(false)).catch(() => {});
    }
  }

  return (
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col">
      {/* 顶栏 */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[var(--color-neon-bg)]/80 px-4 py-2.5 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-white/50 transition-colors hover:text-[var(--color-neon-cyan)]"
          >
            <ArrowLeft className="size-3.5" />
            {exitLabel}
          </Link>
          <span className="hidden truncate font-heading text-sm font-semibold text-white/80 sm:block">
            {title}
          </span>
        </div>
        <button
          type="button"
          onClick={toggleFullscreen}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-white/60 transition-colors hover:border-white/20 hover:text-white"
        >
          {fullscreen ? "Exit Fullscreen" : "Fullscreen"}
        </button>
      </div>

      {/* iframe 容器 */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black"
      >
        {!loaded ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[var(--color-neon-bg)]">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-[var(--color-neon-cyan)] opacity-20" />
              <Loader2 className="size-8 animate-spin text-[var(--color-neon-cyan)]" />
            </div>
            <p className="font-mono text-xs uppercase tracking-widest text-white/60">
              {loadingLabel}
            </p>
          </div>
        ) : null}
        <iframe
          src={playUrl}
          title={title}
          onLoad={() => setLoaded(true)}
          className="h-full w-full border-0"
          allow="autoplay; fullscreen; gamepad; pointer-lock; screen-wake-lock; cross-origin-isolated; xr-spatial-tracking"
          allowFullScreen
          sandbox="allow-scripts allow-same-origin allow-pointer-lock allow-forms allow-popups allow-modals allow-presentation"
        />
      </div>
    </div>
  );
}
