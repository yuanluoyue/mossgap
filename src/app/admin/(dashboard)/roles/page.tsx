import { listSysRoles, listSysMenus } from "@/db/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { RolesActions } from "./roles-actions";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const [roles, menus] = await Promise.all([listSysRoles(), listSysMenus()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">角色管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {roles.length} 个角色 · 通过菜单授权控制可见导航
          </p>
        </div>
        <RolesActions mode="create" menus={menus} />
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">角色名称</TableHead>
              <TableHead className="w-[160px]">编码</TableHead>
              <TableHead>说明</TableHead>
              <TableHead className="w-[100px]">菜单数</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[140px]">创建时间</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  暂无角色
                </TableCell>
              </TableRow>
            ) : (
              roles.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {r.code}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.description || "—"}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{r.menuIds.length}</TableCell>
                  <TableCell>
                    <Badge variant={r.isActive ? "default" : "secondary"}>
                      {r.isActive ? "启用" : "停用"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(r.createdAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <RolesActions
                      mode="edit"
                      role={r}
                      menus={menus}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
