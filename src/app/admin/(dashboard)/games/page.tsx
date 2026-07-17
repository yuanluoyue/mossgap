import Link from "next/link";
import { Gamepad2, Upload, Search, HardDrive, StickyNote, Link2 } from "lucide-react";

import { listAdminGames, listAllCategoriesForPicker } from "@/db/queries";
import { publicObjectUrl } from "@/lib/oss";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pagination } from "@/components/admin/pagination";
import { UploadGameDialog } from "@/components/admin/upload-game-dialog";
import { IframeGameDialog } from "@/components/admin/iframe-game-dialog";
import { GameRowActions } from "@/components/admin/game-row-actions";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;

const STATUS_OPTIONS = [
  { value: "all", label: "全部状态" },
  { value: "draft", label: "草稿" },
  { value: "published", label: "已发布" },
  { value: "archived", label: "已归档" },
];

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(firstOf(sp.page) ?? "1") || 1);
  const search = firstOf(sp.search) ?? "";
  const status = firstOf(sp.status) ?? "all";

  const result = await listAdminGames({
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status: status === "all" ? undefined : (status as "draft" | "published" | "archived"),
  });

  // 加载所有分类，用于在列表中按 categoryId 显示分类名
  const allCategories = await listAllCategoriesForPicker();
  const categoryNameMap = new Map(allCategories.map((c) => [c.id, c.name]));

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));

  // 为每行计算预览用的 playUrl（与 C 端 toPublicGame 一致）
  const rowsWithPlayUrl = await Promise.all(
    result.items.map(async (g) => ({
      ...g,
      playUrl:
        g.sourceType === "iframe" && g.iframeUrl
          ? g.iframeUrl
          : g.ossPrefix
            ? await publicObjectUrl(g.ossPrefix, g.entryFile)
            : "",
    })),
  );

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">游戏管理</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            共 {result.total} 个游戏
          </p>
        </div>
        <div className="flex items-center gap-2">
          <UploadGameDialog>
            <Button>
              <Upload className="size-4" />
              上传游戏
            </Button>
          </UploadGameDialog>
          <IframeGameDialog>
            <Button variant="secondary">
              <Link2 className="size-4" />
              创建 iframe 游戏
            </Button>
          </IframeGameDialog>
        </div>
      </div>

      {/* 筛选 */}
      <form className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={search}
            placeholder="搜索游戏名称..."
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
            <Link href="/admin/games">清除</Link>
          </Button>
        )}
      </form>

      {/* 表格 */}
      <div className="rounded-xl border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">封面</TableHead>
              <TableHead>名称 / Slug</TableHead>
              <TableHead className="w-[100px]">分类</TableHead>
              <TableHead className="w-[100px]">状态</TableHead>
              <TableHead className="w-[100px]">游戏体积</TableHead>
              <TableHead className="w-[160px]">内部备注</TableHead>
              <TableHead className="w-[100px]">上传者</TableHead>
              <TableHead className="w-[120px]">创建时间</TableHead>
              <TableHead className="w-[160px] text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Gamepad2 className="size-8" />
                    <p className="text-sm">暂无游戏</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              rowsWithPlayUrl.map((g) => (
                <TableRow key={g.id}>
                  <TableCell>
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-muted">
                      {g.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.coverImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Gamepad2 className="size-4 text-muted-foreground" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/admin/games/${g.id}/edit`}
                      className="block max-w-[240px] truncate font-medium hover:underline"
                    >
                      {g.title || g.slug}
                    </Link>
                    <p className="max-w-[240px] truncate text-xs text-muted-foreground">
                      {g.slug}
                    </p>
                  </TableCell>
                  <TableCell className="text-sm">
                    {g.categoryId ? (categoryNameMap.get(g.categoryId) ?? "-") : "-"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={g.status} />
                  </TableCell>
                  <TableCell className="tabular-nums text-sm">
                    <span className="inline-flex items-center gap-1">
                      <HardDrive className="size-3 text-muted-foreground" />
                      {formatBytes(g.ossSize)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {g.internalNotes ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex max-w-[150px] cursor-help items-center gap-1 truncate text-muted-foreground">
                            <StickyNote className="size-3 shrink-0" />
                            <span className="truncate">{g.internalNotes}</span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="max-w-sm whitespace-pre-wrap text-left">
                          {g.internalNotes}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {g.uploaderName ?? "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(g.createdAt)}
                  </TableCell>
                  <TableCell>
                    <GameRowActions
                      id={g.id}
                      editHref={`/admin/games/${g.id}/edit`}
                      status={g.status}
                      title={g.title || g.slug}
                      playUrl={g.playUrl}
                    />
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

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
    published: { label: "已发布", variant: "default" },
    draft: { label: "草稿", variant: "secondary" },
    archived: { label: "已归档", variant: "outline" },
  };
  const s = map[status] ?? map.draft;
  return <Badge variant={s.variant}>{s.label}</Badge>;
}

function firstOf(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

/** 格式化字节数为人类可读字符串。 */
function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}
