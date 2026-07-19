import Link from "next/link";
import { Package, Search } from "lucide-react";

import { listAllItems, pickLocalized } from "@/db/queries";
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
import { ItemsActions, ItemEnabledSwitch } from "./items-actions";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const TYPE_OPTIONS = [
  { value: "all", label: "全部类型" },
  { value: "consumable", label: "consumable" },
  { value: "material", label: "material" },
  { value: "gift", label: "gift" },
  { value: "currency", label: "currency" },
  { value: "equipment", label: "equipment" },
];

const RARITY_COLORS: Record<string, string> = {
  common: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
  rare: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  epic: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  legendary: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
};

export default async function ItemsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";
  const typeRaw = firstOf(sp.type) ?? "all";
  const type = typeRaw !== "all" ? typeRaw : undefined;

  const result = await listAllItems({
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
            物品管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {result.total} 个物品
          </p>
        </div>
        <ItemsActions mode="create" />
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索 code 或名称..."
            className="pl-9"
          />
        </div>
        <Select name="type" defaultValue={typeRaw}>
          <SelectTrigger className="w-[160px]">
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
            <Link href="/admin/items">清除</Link>
          </Button>
        )}
      </form>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[260px]">物品</TableHead>
              <TableHead className="w-[120px]">code</TableHead>
              <TableHead className="w-[120px]">type</TableHead>
              <TableHead className="w-[100px]">rarity</TableHead>
              <TableHead className="w-[100px]">堆叠</TableHead>
              <TableHead className="w-[100px]">启用</TableHead>
              <TableHead className="w-[140px]">更新时间</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Package className="size-8" />
                    <p className="text-sm">暂无物品</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((it) => {
                const nameZh = pickLocalized(it.name, "zh");
                return (
                <TableRow key={it.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {it.icon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={it.icon}
                          alt={nameZh}
                          className="size-9 rounded-md object-cover ring-1 ring-border"
                        />
                      ) : (
                        <div className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Package className="size-4" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="max-w-[220px] truncate font-medium">
                          {nameZh}
                        </p>
                        <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                          {pickLocalized(it.name, "en")}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-[10px]">
                      {it.code}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    <Badge variant="outline" className="text-[10px]">
                      {it.type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                        RARITY_COLORS[it.rarity] ?? RARITY_COLORS.common
                      }`}
                    >
                      {it.rarity}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {it.stackable ? (
                      <span>是 · {it.maxStack || "∞"}</span>
                    ) : (
                      <span className="text-xs">否</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <ItemEnabledSwitch
                      itemId={it.id}
                      enabled={it.enabled}
                    />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDateTime(it.updatedAt)}
                  </TableCell>
                  <TableCell className="text-right">
                    <ItemsActions mode="edit" item={it} />
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

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}
