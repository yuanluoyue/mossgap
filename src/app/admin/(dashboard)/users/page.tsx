import Link from "next/link";
import { Search, Users } from "lucide-react";

import { listAdmins, listSysRoles, type AdminUser, type AdminRole } from "@/db/queries";
import { getAuthPayload } from "@/lib/auth";
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
import { Pagination } from "@/components/admin/pagination";
import { formatDateTime } from "@/lib/format";
import { UsersActions } from "./users-actions";
import { UserStatusSwitch } from "./users-actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";

  const [result, roles, me] = await Promise.all([
    listAdmins({
      page,
      pageSize: PAGE_SIZE,
      search: search || undefined,
    }),
    listSysRoles(),
    getAuthPayload(),
  ]);

  const currentUserId = me?.sub ?? "";
  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">用户管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {result.total} 个管理员
          </p>
        </div>
        <UsersActions mode="create" roles={roles} currentUserId={currentUserId} />
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索用户名..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">筛选</Button>
        {search && (
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/users">清除</Link>
          </Button>
        )}
      </form>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[160px]">用户名</TableHead>
              <TableHead className="w-[180px]">昵称</TableHead>
              <TableHead className="w-[220px]">邮箱</TableHead>
              <TableHead className="w-[140px]">角色</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[160px]">注册时间</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Users className="size-8" />
                    <p className="text-sm">暂无用户</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.username}
                      {isSelf && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          我
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {u.email || "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {u.roleName ? (
                        <Badge variant="secondary">{u.roleName}</Badge>
                      ) : (
                        <span className="text-muted-foreground">未分配</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <UserStatusSwitch
                        userId={u.id}
                        isActive={u.isActive}
                        disabled={isSelf}
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(u.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <UsersActions
                        mode="edit"
                        user={u}
                        roles={roles}
                        currentUserId={currentUserId}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
        <Pagination page={page} totalPages={totalPages} search={search} />
      </div>
    </div>
  );
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
