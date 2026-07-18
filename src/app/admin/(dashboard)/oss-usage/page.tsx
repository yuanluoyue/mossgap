import Link from "next/link";
import { HardDrive, Link2, Gamepad2, TrendingUp } from "lucide-react";

import { getOssUsageStats } from "@/db/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { OssUsageActions, RefreshGameSize } from "./oss-usage-actions";

export const dynamic = "force-dynamic";

export default async function OssUsagePage() {
  const stats = await getOssUsageStats();
  const zipGames = stats.perGame.filter((g) => g.sourceType !== "iframe");
  const iframeGames = stats.perGame.filter((g) => g.sourceType === "iframe");
  const totalZipSize = zipGames.reduce((sum, g) => sum + g.ossSize, 0);
  const topGames = [...stats.perGame]
    .filter((g) => g.sourceType !== "iframe")
    .sort((a, b) => b.ossSize - a.ossSize)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">OSS 用量</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            对象存储（OSS）占用统计 · 数据来自数据库缓存
          </p>
        </div>
        <OssUsageActions />
      </div>

      {/* 概览卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-lg bg-violet-50 text-violet-600">
              <HardDrive className="size-5" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums">{formatBytes(stats.total)}</p>
              <p className="text-xs text-muted-foreground">总占用（缓存）</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Gamepad2 className="size-5" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums">{zipGames.length}</p>
              <p className="text-xs text-muted-foreground">ZIP 游戏数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Link2 className="size-5" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums">{iframeGames.length}</p>
              <p className="text-xs text-muted-foreground">iframe 游戏数</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <span className="flex size-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="size-5" />
            </span>
            <div>
              <p className="text-xl font-bold tabular-nums">
                {zipGames.length > 0 ? formatBytes(totalZipSize / zipGames.length) : "—"}
              </p>
              <p className="text-xs text-muted-foreground">平均大小/ZIP</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top 5 占用 */}
      {topGames.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>占用 Top 5</CardTitle>
            <CardDescription>体积最大的 5 个 ZIP 游戏</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topGames.map((g, i) => {
                const percent = totalZipSize > 0 ? (g.ossSize / totalZipSize) * 100 : 0;
                return (
                  <div key={g.id} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <Link
                        href={`/admin/games?edit=${g.id}`}
                        className="truncate font-medium hover:underline"
                      >
                        <span className="mr-2 text-muted-foreground">#{i + 1}</span>
                        {g.title || g.slug}
                      </Link>
                      <span className="ml-2 shrink-0 font-mono tabular-nums">
                        {formatBytes(g.ossSize)} · {percent.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* 完整表格 */}
      <Card>
        <CardHeader>
          <CardTitle>所有游戏 OSS 占用</CardTitle>
          <CardDescription>
            共 {stats.perGame.length} 个游戏 · 总占用 {formatBytes(stats.total)}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60px]">排名</TableHead>
                <TableHead>游戏名称</TableHead>
                <TableHead className="w-[100px]">来源</TableHead>
                <TableHead className="w-[120px]">OSS 占用</TableHead>
                <TableHead className="w-[100px]">占比</TableHead>
                <TableHead className="w-[120px] text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stats.perGame.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-32 text-center">
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                      <HardDrive className="size-8" />
                      <p className="text-sm">暂无数据</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                [...stats.perGame]
                  .sort((a, b) => b.ossSize - a.ossSize)
                  .map((g, i) => {
                    const percent = stats.total > 0 ? (g.ossSize / stats.total) * 100 : 0;
                    return (
                      <TableRow key={g.id}>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          #{i + 1}
                        </TableCell>
                        <TableCell>
                          <Link
                            href={`/admin/games?edit=${g.id}`}
                            className="block max-w-[260px] truncate font-medium hover:underline"
                          >
                            {g.title || g.slug}
                          </Link>
                          <p className="max-w-[260px] truncate text-xs text-muted-foreground">
                            {g.slug}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1">
                            {g.sourceType === "iframe" ? (
                              <Link2 className="size-3" />
                            ) : (
                              <Gamepad2 className="size-3" />
                            )}
                            {g.sourceType === "iframe" ? "iframe" : "zip"}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono tabular-nums">
                          {g.sourceType === "iframe" ? "—" : formatBytes(g.ossSize)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {g.sourceType === "iframe" ? "—" : `${percent.toFixed(1)}%`}
                        </TableCell>
                        <TableCell className="text-right">
                          {g.sourceType === "zip" ? (
                            <RefreshGameSize id={g.id} />
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

/** 字节数格式化 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 2)} ${units[i]}`;
}
