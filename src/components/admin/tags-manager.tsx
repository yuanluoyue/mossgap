"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Search, Tag } from "lucide-react";

import type { AdminTag } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/admin/pagination";
import { TaxonomyRowActions } from "@/components/admin/taxonomy-row-actions";
import {
  TaxonomyFormDialog,
  type TaxonomyFormInitialData,
} from "@/components/admin/taxonomy-form-dialog";

const API_BASE = "/api/admin/tags";

interface TagsManagerProps {
  initialItems: AdminTag[];
  total: number;
  page: number;
  search: string;
}

export function TagsManager({
  initialItems,
  total,
  page,
  search,
}: TagsManagerProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TaxonomyFormInitialData | null>(
    null,
  );

  function openCreate() {
    setEditTarget(null);
    setDialogOpen(true);
  }

  function openEdit(item: AdminTag) {
    setEditTarget({
      id: item.id,
      slug: item.slug,
      name: item.name,
      locale: item.locale,
      icon: item.icon,
      color: item.color,
      sortOrder: item.sortOrder,
      isVisible: item.isVisible,
    });
    setDialogOpen(true);
  }

  const totalPages = Math.max(1, Math.ceil(total / 10));

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            标签管理
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {total} 个标签
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          新增标签
        </Button>
      </div>

      {/* 筛选 */}
      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索标签名称..."
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="secondary">
          筛选
        </Button>
        {search ? (
          <Button asChild type="button" variant="ghost">
            <Link href="/admin/tags">清除</Link>
          </Button>
        ) : null}
      </form>

      {/* 表格 */}
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>名称 / Slug</TableHead>
              <TableHead className="w-[80px]">图标</TableHead>
              <TableHead className="w-[80px]">颜色</TableHead>
              <TableHead className="w-[80px]">排序</TableHead>
              <TableHead className="w-[80px]">可见性</TableHead>
              <TableHead className="w-[80px]">游戏数</TableHead>
              <TableHead className="w-[140px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {initialItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Tag className="size-8" />
                    <p className="text-sm">暂无标签</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              initialItems.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>
                    <div className="max-w-[240px] truncate font-medium">
                      {t.locale.zh.name || t.name}
                    </div>
                    <p className="max-w-[240px] truncate text-xs font-mono text-muted-foreground">
                      {t.slug}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {t.icon ? t.icon : "—"}
                  </TableCell>
                  <TableCell>
                    {t.color ? (
                      <span
                        className="inline-block size-4 rounded border"
                        style={{ backgroundColor: t.color }}
                        title={t.color}
                      />
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {t.sortOrder}
                  </TableCell>
                  <TableCell>
                    {t.isVisible ? (
                      <Badge>显示</Badge>
                    ) : (
                      <Badge variant="secondary">隐藏</Badge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    {t.gameCount}
                  </TableCell>
                  <TableCell>
                    <TaxonomyRowActions
                      id={t.id}
                      isVisible={t.isVisible}
                      apiBase={API_BASE}
                      onEdit={() => openEdit(t)}
                      deleteDescription={`确认删除标签「${t.locale.zh.name || t.name}」？删除后不可恢复。`}
                    />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
        <Pagination page={page} totalPages={totalPages} search={search} />
      </div>

      <TaxonomyFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initialData={editTarget}
        apiBase={API_BASE}
        hasCoverImage={false}
        title={editTarget ? "编辑标签" : "新增标签"}
        description={editTarget ? "修改标签信息" : "创建一个新的标签"}
        onSuccess={() => router.refresh()}
      />
    </div>
  );
}
