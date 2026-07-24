import Link from "next/link";
import { Store, Search } from "lucide-react";

import { listAllBreedOrders } from "@/db/queries";
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
import { BreedMarketActions } from "./breed-market-actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "OPEN", label: "OPEN（挂单中）" },
  { value: "CLOSED", label: "CLOSED（已成交）" },
  { value: "CANCELLED", label: "CANCELLED（已取消）" },
];

const STATUS_COLORS: Record<string, string> = {
  OPEN: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  CLOSED: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  CANCELLED: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

const STATUS_LABELS: Record<string, string> = {
  OPEN: "挂单中",
  CLOSED: "已成交",
  CANCELLED: "已取消",
};

export default async function BreedMarketPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";
  const statusRaw = firstOf(sp.status) ?? "all";
  const status =
    statusRaw !== "all"
      ? (statusRaw as "OPEN" | "CLOSED" | "CANCELLED")
      : undefined;

  const result = await listAllBreedOrders({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            繁育市场
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {result.total} 个挂单
          </p>
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索挂单者邮箱/昵称..."
            className="pl-9"
          />
        </div>
        <Select name="status" defaultValue={statusRaw}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="状态" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4}>
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
        {(search || statusRaw !== "all") && (
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/breed-market">清除</Link>
          </Button>
        )}
      </form>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">挂单者</TableHead>
              <TableHead className="w-[120px]">宠物</TableHead>
              <TableHead>基因摘要</TableHead>
              <TableHead className="w-[100px]">价格</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[140px]">留言</TableHead>
              <TableHead className="w-[140px]">过期时间</TableHead>
              <TableHead className="w-[140px]">创建时间</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Store className="size-8" />
                    <p className="text-sm">暂无挂单</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((order) => {
                const g = order.animalGenome;
                const extraKeys = g.extraGenes
                  ? Object.keys(g.extraGenes).filter(
                      (k) =>
                        g.extraGenes?.[k as keyof typeof g.extraGenes] !==
                        undefined,
                    )
                  : [];
                return (
                  <TableRow key={order.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="max-w-[160px] truncate font-medium">
                          {order.ownerName || "—"}
                        </p>
                        <p className="max-w-[160px] truncate text-xs text-muted-foreground">
                          {order.ownerEmail || order.ownerId.slice(0, 8)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="max-w-[120px] truncate font-mono text-xs">
                          {order.animalSpeciesId || "—"}
                        </p>
                        <span className="inline-flex rounded bg-purple-500/15 px-1.5 py-0.5 text-[10px] font-medium text-purple-600 dark:text-purple-300">
                          G{order.animalGeneration}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.body || "—"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.eye || "—"}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.element || "—"}
                        </Badge>
                        {extraKeys.length > 0 && (
                          <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                            +{extraKeys.length}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold tabular-nums text-foreground">
                        {order.price.toLocaleString()}
                      </span>
                      <span className="ml-0.5 text-[10px] text-muted-foreground">
                        积分
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          STATUS_COLORS[order.status] ?? STATUS_COLORS.CLOSED
                        }`}
                      >
                        {STATUS_LABELS[order.status] ?? order.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {order.description ? (
                        <p
                          className="max-w-[160px] truncate text-xs text-muted-foreground"
                          title={order.description}
                        >
                          {order.description}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.expiredAt ? formatDateTime(order.expiredAt) : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(order.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <BreedMarketActions order={order} />
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
          status={statusRaw}
        />
      </div>
    </div>
  );
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
