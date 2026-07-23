"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Coins, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import type { PublicUser, PointLogItem } from "@/db/queries";

export function PointsContent({ user }: { user: PublicUser }) {
  const t = useTranslations("Profile");

  // 积分日志
  const [logs, setLogs] = useState<PointLogItem[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsPage, setLogsPage] = useState(1);
  const [logsTotal, setLogsTotal] = useState(0);
  const logsPageSize = 10;

  const fetchLogs = useCallback(async (page: number) => {
    setLogsLoading(true);
    try {
      const res = await fetch(`/api/auth/points/logs?page=${page}&pageSize=${logsPageSize}`);
      const json = (await res.json()) as {
        success?: boolean;
        data?: { items: PointLogItem[]; total: number };
      };
      if (res.ok && json.success && json.data) {
        setLogs(json.data.items);
        setLogsTotal(json.data.total);
      }
    } catch {
      // 静默失败，不打扰用户
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => fetchLogs(1));
  }, [fetchLogs]);

  const logsTotalPages = Math.max(1, Math.ceil(logsTotal / logsPageSize));

  function describeChange(log: PointLogItem): string {
    const sign = log.change > 0 ? "+" : "";
    return `${sign}${log.change}`;
  }

  function logTypeLabel(type: string): string {
    switch (type) {
      case "earn":
        return t("pointTypeEarn");
      case "spend":
        return t("pointTypeSpend");
      case "adjust":
        return t("pointTypeAdjust");
      case "revoke":
        return t("pointTypeRevoke");
      default:
        return type;
    }
  }

  return (
    <div className="space-y-6">
      {/* 积分余额卡片 */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Coins className="size-4 text-amber-500" />
            {t("pointBalance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold tracking-tight tabular-nums">
            {user.pointBalance.toLocaleString()}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {t("pointBalanceHint")}
          </p>
        </CardContent>
      </Card>

      {/* 积分日志 */}
      <Card>
        <CardHeader>
          <CardTitle>{t("pointLogs")}</CardTitle>
          <CardDescription>{t("pointLogsHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading && logs.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t("pointLogsEmpty")}
            </p>
          ) : (
            <ul className="divide-y">
              {logs.map((log) => {
                const positive = log.change > 0;
                return (
                  <li key={log.id} className="flex items-center justify-between py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {logTypeLabel(log.type)}
                        </span>
                        {log.bizType ? (
                          <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {log.bizType}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatDateTime(log.createdAt)}</span>
                        {log.remark ? (
                          <span className="truncate">· {log.remark}</span>
                        ) : null}
                      </div>
                    </div>
                    <div className="ml-4 flex flex-col items-end">
                      <span
                        className={`tabular-nums font-semibold ${
                          positive
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-destructive"
                        }`}
                      >
                        {describeChange(log)}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {t("pointBalanceAfter")}: {log.balanceAfter.toLocaleString()}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {logsTotalPages > 1 ? (
            <div className="mt-4 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={logsPage <= 1 || logsLoading}
                onClick={() => {
                  const p = logsPage - 1;
                  setLogsPage(p);
                  Promise.resolve().then(() => fetchLogs(p));
                }}
              >
                {t("prev")}
              </Button>
              <span className="text-xs text-muted-foreground">
                {logsPage} / {logsTotalPages}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={logsPage >= logsTotalPages || logsLoading}
                onClick={() => {
                  const p = logsPage + 1;
                  setLogsPage(p);
                  Promise.resolve().then(() => fetchLogs(p));
                }}
              >
                {t("next")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
