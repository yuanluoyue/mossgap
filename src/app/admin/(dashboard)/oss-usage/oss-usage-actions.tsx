"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2, Database } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** 实时刷新整个 bucket 的 OSS 占用（调 ?live=1 接口） */
export function OssUsageActions() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefreshLive() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch("/api/admin/oss-usage?live=1");
      const data = (await res.json()) as {
        success?: boolean;
        data?: { liveTotal: number };
        error?: { message?: string };
      };
      if (!res.ok || !data.success || !data.data) {
        toast.error(data?.error?.message ?? "刷新失败");
        return;
      }
      toast.success(`实时统计完成：${formatBytes(data.data.liveTotal)}`);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={onRefreshLive} disabled={refreshing}>
        {refreshing ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <Database className="size-4" />
        )}
        {refreshing ? "统计中..." : "实时统计 Bucket"}
      </Button>
    </div>
  );
}

/** 单个游戏刷新按钮 */
export function RefreshGameSize({ id }: { id: string }) {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/games/${id}/refresh-size`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: { ossSize: number };
        error?: { message?: string };
      };
      if (!res.ok || !data.success || !data.data) {
        toast.error(data?.error?.message ?? "刷新失败");
        return;
      }
      toast.success(`已更新：${formatBytes(data.data.ossSize)}`);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onRefresh}
          disabled={refreshing}
        >
          {refreshing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <RefreshCw className="size-4" />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">实时统计</TooltipContent>
    </Tooltip>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 2)} ${units[i]}`;
}
