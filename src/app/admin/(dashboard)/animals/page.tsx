import Link from "next/link";
import { PawPrint, Search } from "lucide-react";

import { listAllAnimals } from "@/db/queries";
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
import { AnimalsActions } from "./animals-actions";
import { RandomAnimalDialog } from "./random-animal-dialog";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "active", label: "active（活跃）" },
  { value: "resting", label: "resting（休息）" },
];

const STATUS_COLORS: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  resting: "bg-slate-500/15 text-slate-600 dark:text-slate-300",
};

const GENERATION_COLORS: Record<number, string> = {
  1: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
  2: "bg-purple-500/15 text-purple-600 dark:text-purple-300",
  3: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
};

export default async function AnimalsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";
  const statusRaw = firstOf(sp.status) ?? "all";
  const status = statusRaw !== "all" ? (statusRaw as "active" | "resting") : undefined;
  const speciesId = firstOf(sp.speciesId) ?? undefined;

  const result = await listAllAnimals({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status,
    speciesId,
  });

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            宠物管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {result.total} 只宠物
          </p>
        </div>
        <div className="flex items-center gap-2">
          <RandomAnimalDialog />
          <AnimalsActions mode="create" />
        </div>
      </div>

      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索持有者邮箱/昵称或 speciesId..."
            className="pl-9"
          />
        </div>
        <Input
          name="speciesId"
          defaultValue={speciesId ?? ""}
          placeholder="speciesId 精确匹配"
          className="w-[200px]"
        />
        <Select name="status" defaultValue={statusRaw}>
          <SelectTrigger className="w-[160px]">
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
        {(search || statusRaw !== "all" || speciesId) && (
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/animals">清除</Link>
          </Button>
        )}
      </form>

      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">持有者</TableHead>
              <TableHead className="w-[120px]">species</TableHead>
              <TableHead className="w-[80px]">代数</TableHead>
              <TableHead>基因摘要</TableHead>
              <TableHead className="w-[80px]">繁殖</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[140px]">创建时间</TableHead>
              <TableHead className="w-[100px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <PawPrint className="size-8" />
                    <p className="text-sm">暂无宠物</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              result.items.map((pet) => {
                const g = pet.genome;
                const extraKeys = g.extraGenes
                  ? Object.keys(g.extraGenes).filter(
                      (k) =>
                        g.extraGenes?.[k as keyof typeof g.extraGenes] !==
                          undefined,
                    )
                  : [];
                return (
                  <TableRow key={pet.id}>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="max-w-[160px] truncate font-medium">
                          {pet.ownerName || "—"}
                        </p>
                        <p className="max-w-[160px] truncate text-xs text-muted-foreground">
                          {pet.ownerEmail || pet.ownerId.slice(0, 8)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {pet.speciesId}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          GENERATION_COLORS[pet.generation] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        G{pet.generation}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.body}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.eye}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.tail}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.pattern}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.element}
                        </Badge>
                        <Badge variant="outline" className="text-[10px]">
                          {g.genes.personality}
                        </Badge>
                        {extraKeys.length > 0 && (
                          <span className="inline-flex items-center rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-300">
                            +{extraKeys.length}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {pet.breedCount}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          STATUS_COLORS[pet.status] ?? STATUS_COLORS.resting
                        }`}
                      >
                        {pet.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(pet.createdAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <AnimalsActions mode="edit" pet={pet} />
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
