"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Trash2, Loader2, Plus, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import type { AdminGame, GameCategory, GameStatus } from "@/types";
import { GAME_CATEGORIES } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";

const CATEGORY_LABELS: Record<GameCategory, string> = {
  action: "动作",
  puzzle: "解谜",
  arcade: "街机",
  adventure: "冒险",
  strategy: "策略",
  sports: "体育",
  racing: "竞速",
  other: "其他",
};

const STATUS_LABELS: Record<GameStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};

interface GameFormProps {
  game: AdminGame;
}

export function GameForm({ game }: GameFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 表单状态
  const [slug, setSlug] = useState(game.slug);
  const [category, setCategory] = useState<GameCategory>(game.category);
  const [status, setStatus] = useState<GameStatus>(game.status);
  const [entryFile, setEntryFile] = useState(game.entryFile);
  const [coverImage, setCoverImage] = useState(game.coverImage);
  const [screenshots, setScreenshots] = useState<string[]>(game.screenshots);
  const [enTitle, setEnTitle] = useState(game.locale.en.title);
  const [enDesc, setEnDesc] = useState(game.locale.en.description);
  const [zhTitle, setZhTitle] = useState(game.locale.zh.title);
  const [zhDesc, setZhDesc] = useState(game.locale.zh.description);

  async function onSave() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          category,
          status,
          entryFile,
          coverImage,
          screenshots: screenshots.filter(Boolean),
          locale: {
            en: { title: enTitle, description: enDesc },
            zh: { title: zhTitle, description: zhDesc },
          },
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !data.success) {
        toast.error(data?.error?.message ?? "保存失败");
        return;
      }
      toast.success("保存成功");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/games/${game.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !data.success) {
        toast.error(data?.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除");
      router.push("/admin/games");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setDeleting(false);
    }
  }

  const playUrl = game.ossPrefix
    ? `${game.ossPrefix}/${entryFile}` // 仅用于显示路径
    : "";

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">
            编辑游戏
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {game.title || game.slug}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {game.status === "published" && game.ossPrefix ? (
            <Button asChild variant="outline">
              <a
                href={`/play/${game.slug}`}
                target="_blank"
                rel="noreferrer"
              >
                <ExternalLink className="size-4" />
                预览
              </a>
            </Button>
          ) : null}
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" disabled={deleting}>
                <Trash2 className="size-4" />
                删除
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>确认删除？</DialogTitle>
                <DialogDescription>
                  删除后不可恢复，OSS 上的游戏资源也会一并清除。
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2 pt-2">
                <DialogClose asChild>
                  <Button variant="ghost">取消</Button>
                </DialogClose>
                <Button variant="destructive" onClick={onDelete} disabled={deleting}>
                  {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                  确认删除
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={onSave} disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* 左：多语言信息 */}
        <div className="space-y-6">
          {/* 中文信息 */}
          <Card>
            <CardHeader>
              <CardTitle>中文信息</CardTitle>
              <CardDescription>展示给中文用户</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>标题</Label>
                <Input value={zhTitle} onChange={(e) => setZhTitle(e.target.value)} placeholder="游戏标题" />
              </div>
              <div className="space-y-1.5">
                <Label>描述</Label>
                <Textarea
                  value={zhDesc}
                  onChange={(e) => setZhDesc(e.target.value)}
                  placeholder="游戏介绍"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 英文信息 */}
          <Card>
            <CardHeader>
              <CardTitle>英文信息</CardTitle>
              <CardDescription>展示给英文用户</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Title</Label>
                <Input value={enTitle} onChange={(e) => setEnTitle(e.target.value)} placeholder="Game title" />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={enDesc}
                  onChange={(e) => setEnDesc(e.target.value)}
                  placeholder="Game description"
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>

          {/* 截图 */}
          <Card>
            <CardHeader>
              <CardTitle>游戏截图</CardTitle>
              <CardDescription>每行一个图片 URL</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {screenshots.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    value={s}
                    onChange={(e) => {
                      const next = [...screenshots];
                      next[i] = e.target.value;
                      setScreenshots(next);
                    }}
                    placeholder="https://..."
                    className="flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => setScreenshots(screenshots.filter((_, idx) => idx !== i))}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setScreenshots([...screenshots, ""])}
              >
                <Plus className="size-4" />
                添加截图
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* 右：配置 */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>基本配置</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Slug</Label>
                <Input
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="my-game"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  URL 标识，仅限小写字母、数字和连字符
                </p>
              </div>

              <div className="space-y-1.5">
                <Label>分类</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as GameCategory)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GAME_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>状态</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as GameStatus)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(STATUS_LABELS) as GameStatus[]).map((s) => (
                      <SelectItem key={s} value={s}>
                        {STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>封面图 URL</Label>
                <Input
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>游戏资源</CardTitle>
              <CardDescription>来自上传的 zip 包</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1.5">
                <Label>入口文件</Label>
                <Input
                  value={entryFile}
                  onChange={(e) => setEntryFile(e.target.value)}
                  placeholder="index.html"
                  className="font-mono"
                />
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">OSS 路径</p>
                <p className="break-all font-mono">{game.ossPrefix || "（无）"}</p>
                {playUrl ? (
                  <p className="mt-2 break-all font-mono text-[10px]">
                    完整 URL: .../{playUrl}
                  </p>
                ) : null}
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3 text-xs">
                <span className="text-muted-foreground">游玩次数</span>
                <span className="font-mono tabular-nums">{game.playCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
