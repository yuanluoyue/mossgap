"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Save,
  Trash2,
  Loader2,
  Plus,
  X,
  ExternalLink,
  RefreshCw,
  Link2,
  Archive,
  HardDrive,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import type { AdminGame, GameCategory, GameSourceType, GameStatus } from "@/types";
import { GAME_CATEGORIES } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ImageUploader } from "@/components/admin/image-uploader";
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
import { cn } from "@/lib/utils";

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

const SOURCE_TYPE_LABELS: Record<GameSourceType, string> = {
  zip: "ZIP 上传",
  iframe: "iframe 外链",
};

interface PickerGame {
  id: string;
  title: string;
  slug: string;
  coverImage: string;
}

interface GameFormProps {
  game: AdminGame;
  /** 候选相关推荐游戏列表 */
  candidates: PickerGame[];
}

export function GameForm({ game, candidates }: GameFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshingSize, setRefreshingSize] = useState(false);

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
  const [enHowTo, setEnHowTo] = useState(game.howToPlay.en);
  const [zhHowTo, setZhHowTo] = useState(game.howToPlay.zh);
  const [iframeUrl, setIframeUrl] = useState(game.iframeUrl);
  const [relatedGameIds, setRelatedGameIds] = useState<string[]>(game.relatedGameIds);
  const [ossSize, setOssSize] = useState(game.ossSize);
  const [featured, setFeatured] = useState(game.featured);

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
          sourceType: game.sourceType,
          iframeUrl,
          howToPlay: { en: enHowTo, zh: zhHowTo },
          relatedGameIds,
          featured,
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

  async function onRefreshSize() {
    if (refreshingSize) return;
    if (game.sourceType !== "zip") {
      toast.info("iframe 模式无 OSS 占用");
      return;
    }
    setRefreshingSize(true);
    try {
      const res = await fetch(`/api/admin/games/${game.id}/refresh-size`, {
        method: "POST",
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: { ossSize: number };
        error?: { message?: string };
      };
      if (!res.ok || !data.success || !data.data) {
        toast.error(data?.error?.message ?? "刷新失败");
        return;
      }
      setOssSize(data.data.ossSize);
      toast.success(`已更新：${formatBytes(data.data.ossSize)}`);
    } catch {
      toast.error("网络错误");
    } finally {
      setRefreshingSize(false);
    }
  }

  const playUrl = game.ossPrefix
    ? `${game.ossPrefix}/${entryFile}`
    : "";

  return (
    <div className="space-y-6">
      {/* 操作栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon">
            <Link href="/admin/games">
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-2xl font-bold tracking-tight">
              编辑游戏
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {game.title || game.slug}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            {game.sourceType === "iframe" ? (
              <Link2 className="size-3" />
            ) : (
              <Archive className="size-3" />
            )}
            {SOURCE_TYPE_LABELS[game.sourceType]}
          </Badge>
          {game.status === "published" ? (
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
              <div className="space-y-1.5">
                <Label>玩法说明（中文）</Label>
                <Textarea
                  value={zhHowTo}
                  onChange={(e) => setZhHowTo(e.target.value)}
                  placeholder="操作方式、规则技巧等，留空则不显示该模块"
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  支持换行；C 端详情页会展示给中文用户
                </p>
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
              <div className="space-y-1.5">
                <Label>How to play (English)</Label>
                <Textarea
                  value={enHowTo}
                  onChange={(e) => setEnHowTo(e.target.value)}
                  placeholder="Controls, rules, tips. Leave empty to hide this section."
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Supports line breaks; shown on the C-end detail page for English users.
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 截图 */}
          <Card>
            <CardHeader>
              <CardTitle>游戏截图</CardTitle>
              <CardDescription>上传游戏截图，每张不超过 5MB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {screenshots.map((s, i) => (
                <div key={i} className="relative">
                  <ImageUploader
                    category="screenshot"
                    url={s}
                    onUrlChange={(url) => {
                      if (!url) {
                        // 删除该截图
                        setScreenshots(screenshots.filter((_, idx) => idx !== i));
                      } else {
                        const next = [...screenshots];
                        next[i] = url;
                        setScreenshots(next);
                      }
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-1 right-1 z-10 bg-background/80"
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

          {/* 相关推荐 */}
          <Card>
            <CardHeader>
              <CardTitle>相关推荐</CardTitle>
              <CardDescription>
                手动选择要在详情页「猜你也喜欢」中展示的游戏（不足会自动按分类补齐）
              </CardDescription>
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  暂无其他已发布游戏可选
                </p>
              ) : (
                <div className="max-h-72 space-y-1.5 overflow-y-auto rounded-lg border p-2">
                  {candidates.map((c) => {
                    const checked = relatedGameIds.includes(c.id);
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors",
                          checked ? "bg-primary/10 text-foreground" : "hover:bg-muted",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setRelatedGameIds([...relatedGameIds, c.id]);
                            } else {
                              setRelatedGameIds(relatedGameIds.filter((id) => id !== c.id));
                            }
                          }}
                          className="size-4 accent-primary"
                        />
                        <div className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded bg-muted">
                          {c.coverImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={c.coverImage} alt="" className="h-full w-full object-cover" />
                          ) : null}
                        </div>
                        <span className="truncate">{c.title || c.slug}</span>
                      </label>
                    );
                  })}
                </div>
              )}
              {relatedGameIds.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  已选 {relatedGameIds.length} 个
                </p>
              ) : null}
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
                <p className="text-xs text-muted-foreground">
                  已发布 = 上架；草稿/已归档 = 下架
                </p>
              </div>

              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="featured-switch">首页推荐</Label>
                  <p className="text-xs text-muted-foreground">
                    开启后显示在首页顶部推荐位
                  </p>
                </div>
                <Switch
                  id="featured-switch"
                  checked={featured}
                  onCheckedChange={setFeatured}
                />
              </div>

              <div className="space-y-1.5">
                <Label>封面图</Label>
                <ImageUploader
                  category="cover"
                  url={coverImage}
                  onUrlChange={setCoverImage}
                />
                <p className="text-xs text-muted-foreground">
                  支持 JPG/PNG/GIF/WEBP，不超过 5MB
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 游戏资源 */}
          <Card>
            <CardHeader>
              <CardTitle>游戏资源</CardTitle>
              <CardDescription>
                {game.sourceType === "iframe"
                  ? "通过 iframe 外链嵌入"
                  : "来自上传的 zip 包"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {/* iframe 模式：iframe URL 可编辑 */}
              {game.sourceType === "iframe" ? (
                <div className="space-y-1.5">
                  <Label>iframe URL</Label>
                  <Input
                    value={iframeUrl}
                    onChange={(e) => setIframeUrl(e.target.value)}
                    placeholder="https://example.com/game/"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    游戏将通过 iframe 嵌入此 URL
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>入口文件</Label>
                    <Input
                      value={entryFile}
                      onChange={(e) => setEntryFile(e.target.value)}
                      placeholder="index.html"
                      className="font-mono"
                    />
                  </div>
                  <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground">OSS 路径</p>
                    <p className="break-all font-mono">{game.ossPrefix || "（无）"}</p>
                    {playUrl ? (
                      <p className="mt-2 break-all font-mono text-[10px]">
                        完整 URL: .../{playUrl}
                      </p>
                    ) : null}
                  </div>
                </>
              )}

              {/* OSS 占用统计 */}
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                  <HardDrive className="size-3.5" />
                  OSS 占用
                </span>
                <span className="font-mono tabular-nums font-semibold text-foreground">
                  {game.sourceType === "iframe" ? "—" : formatBytes(ossSize)}
                </span>
              </div>

              {/* 刷新 OSS 占用按钮（仅 zip 模式） */}
              {game.sourceType === "zip" ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={onRefreshSize}
                  disabled={refreshingSize}
                >
                  {refreshingSize ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <RefreshCw className="size-4" />
                  )}
                  实时统计 OSS 占用
                </Button>
              ) : null}

              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-xs">
                <span className="text-muted-foreground">游玩次数</span>
                <span className="font-mono tabular-nums">{game.playCount}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-muted/40 p-3 text-xs">
                <span className="text-muted-foreground">点赞数</span>
                <span className="font-mono tabular-nums">{game.likeCount}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/** 字节数格式化 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i === 0 ? 0 : 2)} ${units[i]}`;
}
