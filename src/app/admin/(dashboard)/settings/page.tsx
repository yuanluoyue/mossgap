import { listSettings } from "@/db/queries";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/format";
import { SettingsActions } from "./settings-actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const items = await listSettings();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">系统配置</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {items.length} 项配置
          </p>
        </div>
        <SettingsActions mode="create" />
      </div>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[220px]">键</TableHead>
              <TableHead>值</TableHead>
              <TableHead className="w-[200px]">备注</TableHead>
              <TableHead className="w-[160px]">更新时间</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                  暂无配置
                </TableCell>
              </TableRow>
            ) : (
              items.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono text-sm">{s.key}</TableCell>
                  <TableCell className="text-sm">
                    <p className="max-w-[420px] truncate" title={s.value}>
                      {s.value || "—"}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.remark || "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(s.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <SettingsActions
                      mode="edit"
                      item={s}
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
