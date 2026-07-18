import Link from "next/link";
import { Search, Users } from "lucide-react";

import { listCUsers } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui/avatar";
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
import { CUsersActions, CUserStatusSwitch } from "./c-users-actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "正常" },
  { value: "inactive", label: "已停用" },
];

export default async function CUsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";
  const statusRaw = firstOf(sp.status) ?? "all";
  const status =
    statusRaw === "active" || statusRaw === "inactive" ? statusRaw : "all";

  const result = await listCUsers({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    isActive:
      status === "active"
        ? true
        : status === "inactive"
          ? false
          : undefined,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">
          C 端用户管理
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {result.total} 个用户
        </p>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索邮箱或昵称..."
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={status}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button type="submit" variant="secondary">
          筛选
        </Button>
        {(search || status !== "all") && (
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/c-users">清除</Link>
          </Button>
        )}
      </form>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">用户</TableHead>
              <TableHead className="w-[220px]">邮箱</TableHead>
              <TableHead className="w-[160px]">登录方式</TableHead>
              <TableHead className="w-[120px]">语言</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[160px]">最近登录</TableHead>
              <TableHead className="w-[140px]">注册时间</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="size-8" />
                    <p className="text-sm">暂无用户</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((u) => {
                const displayName = u.name || u.email || "—";
                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Avatar size="sm">
                          {u.avatar ? (
                            <AvatarImage src={u.avatar} alt={displayName} />
                          ) : null}
                          <AvatarFallback>
                            {displayName.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[140px] truncate font-medium">
                          {displayName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <span className="block max-w-[200px] truncate">
                        {u.email || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {u.providers.length === 0 ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          u.providers.map((p) => (
                            <Badge
                              key={p}
                              variant="secondary"
                              className="capitalize"
                            >
                              {p}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.locale === "zh" ? "中文" : "English"}
                    </TableCell>
                    <TableCell>
                      <CUserStatusSwitch
                        userId={u.id}
                        isActive={u.isActive}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.lastLoginAt ? formatDateTime(u.lastLoginAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.createdAt ? formatDateTime(u.createdAt) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <CUsersActions user={u} />
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
          status={status}
        />
      </div>
    </div>
  );
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
