import Link from "next/link";
import { Search, MessageSquare } from "lucide-react";

import { listAdminFeedbacks } from "@/db/queries";
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
import { FeedbackRowActionsWithDrawer } from "@/components/admin/feedback-row-actions-with-drawer";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { value: "all", label: "全部类型" },
  { value: "game", label: "游戏反馈" },
  { value: "platform", label: "平台反馈" },
];

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "pending", label: "待处理" },
  { value: "resolved", label: "已处理" },
];

const TYPE_BADGES: Record<string, { label: string; variant: "default" | "secondary" }> = {
  game: { label: "游戏反馈", variant: "default" },
  platform: { label: "平台反馈", variant: "secondary" },
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  pending: { label: "待处理", variant: "secondary" },
  resolved: { label: "已处理", variant: "default" },
};

export default async function AdminFeedbacksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";
  const type = firstOf(sp.type) ?? "all";
  const status = firstOf(sp.status) ?? "all";

  const result = await listAdminFeedbacks({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    type: type === "all" ? undefined : (type as "game" | "platform"),
    status: status === "all" ? undefined : (status as "pending" | "resolved"),
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">反馈管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {result.total} 条反馈
        </p>
      </div>

      {/* 筛选 */}
      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索反馈内容..."
            className="pl-9"
          />
        </div>
        <Select name="type" defaultValue={type}>
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
        {(search || type !== "all" || status !== "all") && (
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/feedbacks">清除</Link>
          </Button>
        )}
      </form>

      {/* 表格 */}
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">类型</TableHead>
              <TableHead>内容</TableHead>
              <TableHead className="w-[120px]">关联游戏</TableHead>
              <TableHead className="w-[140px]">联系方式</TableHead>
              <TableHead className="w-[90px]">状态</TableHead>
              <TableHead className="w-[140px]">提交时间</TableHead>
              <TableHead className="w-[120px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <MessageSquare className="size-8" />
                    <p className="text-sm">暂无反馈</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>
                    <Badge variant={TYPE_BADGES[f.type]?.variant ?? "secondary"}>
                      {TYPE_BADGES[f.type]?.label ?? f.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <p className="max-w-[320px] truncate text-sm" title={f.content}>
                      {f.content}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.gameTitle ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {f.contact || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGES[f.status]?.variant ?? "secondary"}>
                      {STATUS_BADGES[f.status]?.label ?? f.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(f.createdAt)}
                  </TableCell>
                  <TableCell>
                    <FeedbackRowActionsWithDrawer id={f.id} status={f.status} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        {/* 分页 */}
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
