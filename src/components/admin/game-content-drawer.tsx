"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, Loader2, Plus, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import type { GameContent, GameFaqItem } from "@/types";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetBody,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { RichTextEditor } from "@/components/admin/rich-text-editor";

interface GameContentDrawerProps {
  gameId: string;
  gameSlug: string;
  gameStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Locale = "en" | "zh";

/**
 * 游戏详情内容抽屉（攻略/SEO/FAQ）
 *
 * 按 locale 区分内容（en/zh），切换 tab 加载对应数据。
 * howToPlay/tips/controls 使用富文本编辑器，FAQ 为动态列表，
 * SEO 字段为纯文本。保存时 PUT 回 /api/admin/games/[id]/content。
 */
export function GameContentDrawer({
  gameId,
  gameSlug,
  gameStatus,
  open,
  onOpenChange,
}: GameContentDrawerProps) {
  const router = useRouter();
  const [locale, setLocale] = useState<Locale>("en");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [summary, setSummary] = useState("");
  const [howToPlay, setHowToPlay] = useState("");
  const [tips, setTips] = useState("");
  const [controls, setControls] = useState("");
  const [faq, setFaq] = useState<GameFaqItem[]>([]);
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDescription, setSeoDescription] = useState("");
  const [keywords, setKeywords] = useState("");
  const [canonical, setCanonical] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string>("");

  // 打开或切换 locale 时拉取对应内容
  useEffect(() => {
    if (!open || !gameId) return;
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
    });
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/games/${gameId}/content?locale=${locale}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          success?: boolean;
          data?: GameContent | null;
          error?: { message?: string };
        };
        if (cancelled) return;
        if (!res.ok || !data.success) {
          toast.error(data?.error?.message ?? "加载失败");
          return;
        }
        const c = data.data;
        setSummary(c?.summary ?? "");
        setHowToPlay(c?.howToPlay ?? "");
        setTips(c?.tips ?? "");
        setControls(c?.controls ?? "");
        setFaq(c?.faq ?? []);
        setSeoTitle(c?.seoTitle ?? "");
        setSeoDescription(c?.seoDescription ?? "");
        setKeywords(c?.keywords ?? "");
        setCanonical(c?.canonical ?? "");
        setUpdatedAt(c?.updatedAt ?? "");
      } catch {
        if (!cancelled) {
          toast.error("网络错误");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, gameId, locale]);

  function addFaq() {
    setFaq([...faq, { question: "", answer: "" }]);
  }

  function removeFaq(idx: number) {
    setFaq(faq.filter((_, i) => i !== idx));
  }

  function updateFaq(idx: number, field: keyof GameFaqItem, value: string) {
    const next = [...faq];
    next[idx] = { ...next[idx], [field]: value };
    setFaq(next);
  }

  async function onSave() {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/games/${gameId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          summary,
          howToPlay,
          tips,
          controls,
          faq,
          seoTitle,
          seoDescription,
          keywords,
          canonical,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: GameContent;
        error?: { message?: string };
      };
      if (!res.ok || !data.success) {
        toast.error(data?.error?.message ?? "保存失败");
        return;
      }
      const c = data.data;
      if (c) {
        setUpdatedAt(c.updatedAt);
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

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-[95vw] max-w-[1100px] sm:max-w-[1100px]"
      >
        <SheetHeader>
          <div className="flex items-center justify-between gap-4 pr-8">
            <div className="space-y-1">
              <SheetTitle>编辑游戏详情内容</SheetTitle>
              <SheetDescription>
                {gameSlug} · 攻略 / FAQ / SEO 长尾词
              </SheetDescription>
            </div>
            {gameStatus === "published" ? (
              <Button asChild variant="outline" size="sm">
                <a
                  href={`/games/${gameSlug}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-4" />
                  C 端预览
                </a>
              </Button>
            ) : null}
          </div>
        </SheetHeader>

        <SheetBody>
          {/* 语言切换 */}
          <Tabs
            value={locale}
            onValueChange={(v) => setLocale(v as Locale)}
            className="mb-4"
          >
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="zh">中文</TabsTrigger>
            </TabsList>
          </Tabs>

          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" />
              加载中...
            </div>
          ) : (
            <div className="space-y-6">
              {/* 摘要 */}
              <Card>
                <CardHeader>
                  <CardTitle>摘要</CardTitle>
                  <CardDescription>
                    简短描述（用于列表副标题、社交分享），最多 2000 字
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={summary}
                    onChange={(e) => setSummary(e.target.value)}
                    placeholder={
                      locale === "en"
                        ? "Short summary of the game..."
                        : "游戏简短摘要..."
                    }
                    rows={3}
                  />
                </CardContent>
              </Card>

              {/* 玩法说明 - 富文本 */}
              <Card>
                <CardHeader>
                  <CardTitle>玩法说明（攻略）</CardTitle>
                  <CardDescription>
                    富文本编辑器，用于长尾 SEO 内容；可插入标题/列表/图片/链接
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    key={`howToPlay-${locale}`}
                    content={howToPlay}
                    onChange={setHowToPlay}
                    placeholder={
                      locale === "en"
                        ? "Detailed walkthrough / how to play..."
                        : "详细玩法攻略..."
                    }
                    minHeight={280}
                  />
                </CardContent>
              </Card>

              {/* 技巧 */}
              <Card>
                <CardHeader>
                  <CardTitle>技巧</CardTitle>
                  <CardDescription>进阶技巧与提示</CardDescription>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    key={`tips-${locale}`}
                    content={tips}
                    onChange={setTips}
                    placeholder={
                      locale === "en" ? "Tips and tricks..." : "技巧提示..."
                    }
                    minHeight={180}
                  />
                </CardContent>
              </Card>

              {/* 操作说明 */}
              <Card>
                <CardHeader>
                  <CardTitle>操作说明</CardTitle>
                  <CardDescription>键盘/鼠标/触屏操作指引</CardDescription>
                </CardHeader>
                <CardContent>
                  <RichTextEditor
                    key={`controls-${locale}`}
                    content={controls}
                    onChange={setControls}
                    placeholder={
                      locale === "en"
                        ? "Controls (keyboard / mouse / touch)..."
                        : "操作说明（键盘/鼠标/触屏）..."
                    }
                    minHeight={180}
                  />
                </CardContent>
              </Card>

              {/* FAQ */}
              <Card>
                <CardHeader>
                  <CardTitle>FAQ</CardTitle>
                  <CardDescription>
                    常见问题（C 端折叠展示，并作为 FAQPage 结构化数据用于 SEO）
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {faq.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      暂无 FAQ，点击下方按钮添加
                    </p>
                  ) : null}
                  {faq.map((item, idx) => (
                    <div
                      key={idx}
                      className="space-y-2 rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-xs font-mono text-muted-foreground">
                          Q{idx + 1}
                        </span>
                        <Input
                          value={item.question}
                          onChange={(e) =>
                            updateFaq(idx, "question", e.target.value)
                          }
                          placeholder="问题"
                        />
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeFaq(idx)}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                      <Textarea
                        value={item.answer}
                        onChange={(e) =>
                          updateFaq(idx, "answer", e.target.value)
                        }
                        placeholder="答案"
                        rows={2}
                      />
                    </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addFaq}>
                    <Plus className="size-4" />
                    添加 FAQ
                  </Button>
                </CardContent>
              </Card>

              {/* SEO 配置 */}
              <Card>
                <CardHeader>
                  <CardTitle>SEO 配置</CardTitle>
                  <CardDescription>
                    为空时 C 端回退到游戏标题/描述；keywords 为逗号分隔
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>SEO 标题</Label>
                    <Input
                      value={seoTitle}
                      onChange={(e) => setSeoTitle(e.target.value)}
                      placeholder="留空则使用游戏标题"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>SEO 描述</Label>
                    <Textarea
                      value={seoDescription}
                      onChange={(e) => setSeoDescription(e.target.value)}
                      placeholder="留空则使用摘要或默认描述"
                      rows={3}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>关键词</Label>
                    <Input
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                      placeholder="keyword1, keyword2, keyword3"
                      className="font-mono text-xs"
                    />
                    <p className="text-xs text-muted-foreground">
                      逗号分隔，用于 meta keywords 与长尾 SEO 参考
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Canonical URL</Label>
                    <Input
                      value={canonical}
                      onChange={(e) => setCanonical(e.target.value)}
                      placeholder="留空则使用当前页面 URL"
                      className="font-mono text-xs"
                    />
                  </div>
                </CardContent>
              </Card>

              {updatedAt ? (
                <p className="text-right text-xs text-muted-foreground">
                  最后更新：{new Date(updatedAt).toLocaleString("zh-CN")}
                </p>
              ) : null}
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            取消
          </Button>
          <Button onClick={onSave} disabled={saving || loading}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            保存（{locale === "en" ? "English" : "中文"}）
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
