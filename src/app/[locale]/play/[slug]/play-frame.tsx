"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, ArrowLeft, Maximize, Minimize } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="relative flex min-h-[calc(100vh-4rem)] flex-col bg-background">
      {/* 顶栏 */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 px-4 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/games"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowLeft className="size-4" />
            {exitLabel}
          </Link>
          <span className="hidden truncate font-heading text-sm font-semibold text-foreground sm:block">
            {title}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={toggleFullscreen}
          className="btn-press rounded-full"
        >
          {fullscreen ? (
            <>
              <Minimize className="size-4" />
              <span className="hidden sm:inline">Exit Fullscreen</span>
            </>
          ) : (
            <>
              <Maximize className="size-4" />
              <span className="hidden sm:inline">Fullscreen</span>
            </>
          )}
        </Button>
      </div>

      {/* iframe 容器 */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black"
      >
        {!loaded ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-background">
            <div className="relative">
              <div className="absolute inset-0 animate-ping rounded-full bg-primary opacity-20" />
              <Loader2 className="size-8 animate-spin text-primary" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">
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
