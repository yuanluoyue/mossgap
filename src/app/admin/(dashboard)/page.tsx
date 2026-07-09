import Link from "next/link";
import { Gamepad2, Upload, FileEdit, Eye, Archive, CheckCircle2 } from "lucide-react";

import { getDashboardStats } from "@/db/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { UploadGameDialog } from "@/components/admin/upload-game-dialog";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  published: { label: "已发布", variant: "default" },
  draft: { label: "草稿", variant: "secondary" },
  archived: { label: "已归档", variant: "outline" },
};

export default async function AdminDashboardPage() {
  const stats = await getDashboardStats();

  const statCards = [
    {
      label: "游戏总数",
      value: stats.total,
      icon: Gamepad2,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "已发布",
      value: stats.published,
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-50",
    },
    {
      label: "草稿",
      value: stats.draft,
      icon: FileEdit,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: "已归档",
      value: stats.archived,
      icon: Archive,
      color: "text-slate-500",
      bg: "bg-slate-100",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 页头 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">控制台</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            游戏平台数据概览
          </p>
        </div>
        <UploadGameDialog>
          <Button>
            <Upload className="size-4" />
            上传游戏
          </Button>
        </UploadGameDialog>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4">
              <span className={`flex size-11 items-center justify-center rounded-lg ${s.bg} ${s.color}`}>
                <s.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-bold tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 最近游戏 */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>最近添加</CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/games">查看全部</Link>
          </Button>
        </CardHeader>
        <CardContent className="px-0">
          {stats.recent.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Gamepad2 className="mx-auto mb-3 size-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">还没有游戏，点击右上角上传第一个吧</p>
            </div>
          ) : (
            <div className="divide-y">
              {stats.recent.map((g) => {
                const st = STATUS_LABELS[g.status] ?? STATUS_LABELS.draft;
                return (
                  <Link
                    key={g.id}
                    href={`/admin/games/${g.id}/edit`}
                    className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {g.coverImage ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={g.coverImage} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Gamepad2 className="size-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{g.title || g.slug}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {g.slug} · {formatDate(g.createdAt)}
                      </p>
                    </div>
                    <Badge variant={st.variant}>{st.label}</Badge>
                    <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:inline-flex">
                      <Eye className="size-3" />
                      {g.playCount}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
