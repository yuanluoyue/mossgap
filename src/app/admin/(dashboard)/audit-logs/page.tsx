import Link from "next/link";
import { Search, ScrollText } from "lucide-react";

import { listAuditLogs } from "@/db/queries";
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

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const RESOURCE_OPTIONS = [
  { value: "all", label: "全部资源" },
  { value: "menus", label: "菜单" },
  { value: "roles", label: "角色" },
  { value: "users", label: "用户" },
  { value: "settings", label: "配置" },
  { value: "profile", label: "个人中心" },
  { value: "game", label: "游戏" },
];

const ACTION_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  "menu.create": { label: "创建菜单", variant: "default" },
  "menu.update": { label: "更新菜单", variant: "secondary" },
  "menu.delete": { label: "删除菜单", variant: "outline" },
  "role.create": { label: "创建角色", variant: "default" },
  "role.update": { label: "更新角色", variant: "secondary" },
  "role.delete": { label: "删除角色", variant: "outline" },
  "user.create": { label: "创建用户", variant: "default" },
  "user.update": { label: "更新用户", variant: "secondary" },
  "user.delete": { label: "删除用户", variant: "outline" },
  "setting.create": { label: "创建配置", variant: "default" },
  "setting.update": { label: "更新配置", variant: "secondary" },
  "setting.delete": { label: "删除配置", variant: "outline" },
  "profile.update": { label: "更新资料", variant: "secondary" },
  "profile.update_avatar": { label: "更新头像", variant: "secondary" },
  "profile.change_password": { label: "修改密码", variant: "outline" },
};

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";
  const resource = firstOf(sp.resource) ?? "all";
  const action = firstOf(sp.action) ?? "all";

  const result = await listAuditLogs({
    page,
    pageSize: PAGE_SIZE,
    resource: resource === "all" ? undefined : resource,
    action: action === "all" ? undefined : action,
    user: search || undefined,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">操作日志</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {result.total} 条日志
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索操作人..."
            className="pl-9"
          />
        </div>
        <Select name="resource" defaultValue={resource}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="资源" />
          </SelectTrigger>
          <SelectContent>
            {RESOURCE_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">筛选</Button>
        {(search || resource !== "all" || action !== "all") && (
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/audit-logs">清除</Link>
          </Button>
        )}
      </form>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">操作</TableHead>
              <TableHead className="w-[120px]">资源</TableHead>
              <TableHead className="w-[120px]">操作人</TableHead>
              <TableHead>目标 ID</TableHead>
              <TableHead className="w-[140px]">IP</TableHead>
              <TableHead className="w-[160px]">时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <ScrollText className="size-8" />
                    <p className="text-sm">暂无日志</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((log) => {
                const badge = ACTION_BADGES[log.action];
                return (
                  <TableRow key={log.id}>
                    <TableCell>
                      <Badge variant={badge?.variant ?? "secondary"}>
                        {badge?.label ?? log.action}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {log.resource ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {log.operatorUsername ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.targetId || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.operatorIp || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(log.createdAt)}
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
          status={resource}
          type={action}
        />
      </div>
    </div>
  );
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
