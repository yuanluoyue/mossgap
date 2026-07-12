"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GameDetailError]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Error
      </p>
      <p className="text-sm text-foreground/80">
        {error.message || "Something went wrong"}
      </p>
      <button
        onClick={reset}
        className="rounded-md border border-border px-4 py-2 text-xs font-medium transition-colors hover:bg-accent"
      >
        Try again
      </button>
    </div>
  );
}
