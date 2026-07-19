import Link from "next/link";
import { Gift, Search, Target } from "lucide-react";

import { listAllMissions, pickLocalized } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/admin/pagination";
import { formatDateTime } from "@/lib/format";
import { MissionsActions, MissionEnabledSwitch } from "./missions-actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { value: "all", label: "全部类型" },
  { value: "daily", label: "每日任务" },
  { value: "weekly", label: "每周任务" },
  { value: "achievement", label: "成就" },
];

export default async function MissionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";
  const typeRaw = firstOf(sp.type) ?? "all";
  const type =
    typeRaw === "daily" || typeRaw === "weekly" || typeRaw === "achievement"
      ? typeRaw
      : undefined;

  const result = await listAllMissions({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    type,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            任务管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {result.total} 个任务
          </p>
        </div>
        <MissionsActions mode="create" />
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索任务名称..."
            className="pl-9"
          />
        </div>
        <Select name="type" defaultValue={typeRaw}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="类型" />
          </SelectTrigger>
          <SelectContent>
            {TYPE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          筛选
        </Button>
        {(search || typeRaw !== "all") && (
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/missions">清除</Link>
          </Button>
        )}
      </form>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">任务名称</TableHead>
              <TableHead className="w-[100px]">类型</TableHead>
              <TableHead className="w-[120px]">事件</TableHead>
              <TableHead className="w-[100px]">目标</TableHead>
              <TableHead className="w-[120px]">奖励</TableHead>
              <TableHead className="w-[100px]">启用</TableHead>
              <TableHead className="w-[140px]">有效期</TableHead>
              <TableHead className="w-[140px]">更新时间</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Target className="size-8" />
                    <p className="text-sm">暂无任务</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((m) => {
                const nameZh = pickLocalized(m.name, "zh");
                const descZh = pickLocalized(m.description, "zh");
                return (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {m.icon ? (
                        <span className="text-base">{m.icon}</span>
                      ) : (
                        <Gift className="size-4 text-muted-foreground" />
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[180px] truncate font-medium">
                          {nameZh}
                        </p>
                        {descZh ? (
                          <p className="max-w-[180px] truncate text-xs text-muted-foreground">
                            {descZh}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">
                      {typeLabel(m.type)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {m.event ? (
                      <Badge variant="secondary" className="text-[10px]">
                        {m.event}
                      </Badge>
                    ) : (
                      <span className="text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">
                    {m.target}
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-0.5 text-sm font-medium text-amber-600 dark:text-amber-400">
                      +{m.rewardValue}
                    </span>
                  </TableCell>
                  <TableCell>
                    <MissionEnabledSwitch
                      missionId={m.id}
                      enabled={m.enabled}
                    />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {m.startAt || m.endAt ? (
                      <div>
                        {m.startAt ? (
                          <div>起 {formatDateTime(m.startAt)}</div>
                        ) : null}
                        {m.endAt ? (
                          <div>止 {formatDateTime(m.endAt)}</div>
                        ) : null}
                      </div>
                    ) : (
                      <span>长期</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(m.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <MissionsActions mode="edit" mission={m} />
                  </TableCell>
                </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <Pagination
          page={page}
          totalPages={totalPages}
          search={search}
          status={typeRaw}
        />
      </div>
    </div>
  );
}

function typeLabel(type: string): string {
  switch (type) {
    case "daily":
      return "每日";
    case "weekly":
      return "每周";
    case "achievement":
      return "成就";
    default:
      return type;
  }
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
