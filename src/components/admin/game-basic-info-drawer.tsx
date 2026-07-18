"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Plus, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import type { AdminGame, GameBadge, GameStatus } from "@/types";
import {
  GAME_BADGES,
  GAME_BADGE_LABELS,
  GAME_BADGE_STYLES,
} from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const STATUS_LABELS: Record<GameStatus, string> = {
  draft: "草稿",
  published: "已发布",
  archived: "已归档",
};

interface GameBasicInfoDrawerProps {
  gameId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: { id: string; slug: string; name: string; color: string | null }[];
  tags: { id: string; slug: string; name: string; color: string | null }[];
  collections: { id: string; slug: string; name: string }[];
}

/**
 * 游戏基本信息抽屉（编辑）
 *
 * 打开时通过 API 拉取游戏详情，保存时 PATCH 回去。
 * 抽屉做宽（约 1100px），保留原 edit 页面全部字段。
 */
export function GameBasicInfoDrawer({
  gameId,
  open,
  onOpenChange,
  categories,
  tags,
  collections,
}: GameBasicInfoDrawerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [game, setGame] = useState<AdminGame | null>(null);

  // 表单状态（仅在 game 加载后使用）
  const [slug, setSlug] = useState("");
  const [status, setStatus] = useState<GameStatus>("draft");
  const [entryFile, setEntryFile] = useState("index.html");
  const [coverImage, setCoverImage] = useState("");
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [enTitle, setEnTitle] = useState("");
  const [enDesc, setEnDesc] = useState("");
  const [zhTitle, setZhTitle] = useState("");
  const [zhDesc, setZhDesc] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [collectionIds, setCollectionIds] = useState<string[]>([]);
  const [internalNotes, setInternalNotes] = useState<string>("");
  const [iframeUrl, setIframeUrl] = useState<string>("");
  const [badge, setBadge] = useState<GameBadge[]>([]);
  const [weight, setWeight] = useState<number>(0);

  // 打开时拉取游戏详情
  useEffect(() => {
    if (!open || !gameId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
    });
    (async () => {
      try {
        const res = await fetch(`/api/admin/games/${gameId}`, {
          cache: "no-store",
        });
        const data = (await res.json()) as {
          success?: boolean;
          data?: AdminGame;
          error?: { message?: string };
        };
        if (cancelled) return;
        if (!res.ok || !data.success || !data.data) {
          toast.error(data?.error?.message ?? "加载失败");
          onOpenChange(false);
          return;
        }
        const g = data.data;
        setGame(g);
        setSlug(g.slug);
        setStatus(g.status);
        setEntryFile(g.entryFile);
        setCoverImage(g.coverImage);
        setScreenshots(g.screenshots);
        setEnTitle(g.locale.en.title);
        setEnDesc(g.locale.en.description);
        setZhTitle(g.locale.zh.title);
        setZhDesc(g.locale.zh.description);
        setCategoryId(g.categoryId ?? "");
        setTagIds(g.tagIds ?? []);
        setCollectionIds(g.collectionIds ?? []);
        setInternalNotes(g.internalNotes ?? "");
        setIframeUrl(g.iframeUrl ?? "");
        setBadge(g.badge ?? []);
        setWeight(g.weight ?? 0);
      } catch {
        if (!cancelled) {
          toast.error("网络错误");
          onOpenChange(false);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, gameId, onOpenChange]);

  function toggleBadge(b: GameBadge) {
    setBadge((cur) => (cur.includes(b) ? cur.filter((x) => x !== b) : [...cur, b]));
  }

  async function onSave() {
    if (saving || !game) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/games/${game.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          status,
          entryFile,
          coverImage,
          screenshots: screenshots.filter(Boolean),
          locale: {
            en: { title: enTitle, description: enDesc },
            zh: { title: zhTitle, description: zhDesc },
          },
          sourceType: game.sourceType,
          iframeUrl: game.sourceType === "iframe" ? iframeUrl : "",
          categoryId: categoryId || null,
          tagIds,
          collectionIds,
          internalNotes,
          badge,
          weight,
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
      onOpenChange(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  const isIframe = game?.sourceType === "iframe";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[95vw] max-w-[1100px] sm:max-w-[1100px]"
      >
        <SheetHeader>
          <SheetTitle>编辑游戏基本信息</SheetTitle>
          <SheetDescription>
            {game ? game.title || game.slug : "加载中..."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              加载中...
            </div>
          ) : game ? (
            <div className="space-y-6">
              {/* 顶部操作行：预览 + 保存 */}
              <div className="flex items-center justify-end gap-2">
                {game.status === "published" ? (
                  <Button asChild variant="outline" size="sm">
                    <a
                      href={`/games/${game.slug}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      <ExternalLink className="size-4" />
                      C 端预览
                    </a>
                  </Button>
                ) : null}
              </div>

              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                {/* 左：多语言信息 + 截图 + 备注 */}
                <div className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>中文信息</CardTitle>
                      <CardDescription>展示给中文用户</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>标题</Label>
                        <Input
                          value={zhTitle}
                          onChange={(e) => setZhTitle(e.target.value)}
                          placeholder="游戏标题"
                        />
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

                  <Card>
                    <CardHeader>
                      <CardTitle>英文信息</CardTitle>
                      <CardDescription>展示给英文用户</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-1.5">
                        <Label>Title</Label>
                        <Input
                          value={enTitle}
                          onChange={(e) => setEnTitle(e.target.value)}
                          placeholder="Game title"
                        />
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
                            onClick={() =>
                              setScreenshots(screenshots.filter((_, idx) => idx !== i))
                            }
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

                  <Card>
                    <CardHeader>
                      <CardTitle>内部备注</CardTitle>
                      <CardDescription>仅在后台展示，C 端用户不可见</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        value={internalNotes}
                        onChange={(e) => setInternalNotes(e.target.value)}
                        placeholder="可记录游戏来源、版权信息、运营注意事项等"
                        rows={4}
                      />
                    </CardContent>
                  </Card>
                </div>

                {/* 右：基本配置 + 资源 + 运营 */}
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
                        <Label>状态</Label>
                        <Select
                          value={status}
                          onValueChange={(v) => setStatus(v as GameStatus)}
                        >
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
                        <Label>关联分类</Label>
                        <Select value={categoryId} onValueChange={setCategoryId}>
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="不关联" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>标签</Label>
                        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                          {tags.map((tag) => (
                            <div key={tag.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`drawer-tag-${tag.id}`}
                                checked={tagIds.includes(tag.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) setTagIds([...tagIds, tag.id]);
                                  else
                                    setTagIds(tagIds.filter((id) => id !== tag.id));
                                }}
                              />
                              <Label
                                htmlFor={`drawer-tag-${tag.id}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                {tag.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>专题</Label>
                        <div className="max-h-40 space-y-2 overflow-y-auto rounded-lg border p-3">
                          {collections.map((collection) => (
                            <div key={collection.id} className="flex items-center gap-2">
                              <Checkbox
                                id={`drawer-col-${collection.id}`}
                                checked={collectionIds.includes(collection.id)}
                                onCheckedChange={(checked) => {
                                  if (checked)
                                    setCollectionIds([...collectionIds, collection.id]);
                                  else
                                    setCollectionIds(
                                      collectionIds.filter((id) => id !== collection.id),
                                    );
                                }}
                              />
                              <Label
                                htmlFor={`drawer-col-${collection.id}`}
                                className="cursor-pointer text-sm font-normal"
                              >
                                {collection.name}
                              </Label>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label>封面图</Label>
                        <ImageUploader
                          category="cover"
                          url={coverImage}
                          onUrlChange={setCoverImage}
                        />
                        <Input
                          value={coverImage}
                          onChange={(e) => setCoverImage(e.target.value)}
                          placeholder="或填写图片 URL：https://..."
                          className="font-mono text-xs"
                        />
                        <p className="text-xs text-muted-foreground">
                          可直接上传图片，或填写图片 URL
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>游戏资源</CardTitle>
                      <CardDescription>
                        {isIframe
                          ? "通过 iframe 嵌入第三方游戏"
                          : "来自上传的 zip 包"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 text-sm">
                      {isIframe ? (
                        <div className="space-y-1.5">
                          <Label>iframe URL</Label>
                          <Input
                            value={iframeUrl}
                            onChange={(e) => setIframeUrl(e.target.value)}
                            placeholder="https://example.com/game/index.html"
                            className="font-mono"
                          />
                          <p className="text-xs text-muted-foreground">
                            游戏将通过 iframe 嵌入此 URL，保存后生效
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
                          <div className="rounded-lg bg-slate-50 p-3 text-xs text-muted-foreground">
                            <p className="mb-1 font-medium text-foreground">OSS 路径</p>
                            <p className="break-all font-mono">
                              {game.ossPrefix || "（无）"}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            如需替换资源，请到编辑页面上传新 zip 包
                          </p>
                        </>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>运营配置</CardTitle>
                      <CardDescription>角标与排序权重用于 C 端推荐与展示</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>角标</Label>
                        <div className="flex flex-wrap gap-2">
                          {GAME_BADGES.map((b) => {
                            const active = badge.includes(b);
                            return (
                              <button
                                key={b}
                                type="button"
                                onClick={() => toggleBadge(b)}
                                className={
                                  active
                                    ? "inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary transition-colors"
                                    : "inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent"
                                }
                                aria-pressed={active}
                              >
                                <span
                                  className={cn(
                                    "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold leading-none",
                                    GAME_BADGE_STYLES[b],
                                  )}
                                >
                                  {GAME_BADGE_LABELS[b]}
                                </span>
                                {active ? "已选" : "点击选择"}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          NEW 表示新上线，HOT 表示热门；可同时选多个
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label>排序权重</Label>
                        <Input
                          type="number"
                          value={weight}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            setWeight(Number.isFinite(v) ? v : 0);
                          }}
                          placeholder="0"
                          className="font-mono"
                        />
                        <p className="text-xs text-muted-foreground">
                          数值越大越靠前，默认 0；可用于置顶或运营排序
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <Label>发布时间</Label>
                        <div className="rounded-lg bg-slate-50 p-3 text-xs">
                          {game.publishedAt ? (
                            <span className="font-mono tabular-nums text-foreground">
                              {new Date(game.publishedAt).toLocaleString("zh-CN", {
                                year: "numeric",
                                month: "2-digit",
                                day: "2-digit",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">
                              未发布（首次发布时自动记录）
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          状态切换为「已发布」时自动填充，不支持手动修改
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : null}
        </SheetBody>

        <SheetFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={onSave} disabled={saving || loading || !game}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
