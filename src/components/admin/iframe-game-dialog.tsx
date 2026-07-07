"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Link2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GAME_CATEGORIES } from "@/types";
import type { GameCategory } from "@/types";

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

interface IframeGameDialogProps {
  children: React.ReactNode;
}

/** 创建 iframe 外链游戏：填表后调 POST /api/admin/games 创建草稿 */
export function IframeGameDialog({ children }: IframeGameDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [iframeUrl, setIframeUrl] = useState("");
  const [category, setCategory] = useState<GameCategory>("other");
  const [coverImage, setCoverImage] = useState("");

  function reset() {
    setSlug("");
    setTitle("");
    setIframeUrl("");
    setCategory("other");
    setCoverImage("");
  }

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next && !creating) reset();
  }

  async function onCreate() {
    if (creating) return;
    // 清洗 iframeUrl：去除首尾空白、反引号、引号等常见误粘贴字符
    const cleanedUrl = iframeUrl
      .trim()
      .replace(/^["'`]+|["'`]+$/g, "");
    if (!slug.trim() || !title.trim() || !cleanedUrl) {
      toast.error("请填写 slug、标题和 iframe URL");
      return;
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      toast.error("slug 只能包含小写字母、数字和连字符");
      return;
    }
    try {
      new URL(cleanedUrl);
    } catch {
      toast.error("iframe URL 格式不正确，请输入完整的 http/https 链接");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          title,
          iframeUrl: cleanedUrl,
          category,
          coverImage,
        }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        data?: { id: string };
        error?: { message?: string };
      };
      if (!res.ok || !data.success || !data.data) {
        toast.error(data?.error?.message ?? "创建失败");
        return;
      }
      toast.success("已创建，请补充更多信息");
      setOpen(false);
      reset();
      router.push(`/admin/games/${data.data.id}/edit`);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="size-5 text-primary" />
            创建 iframe 游戏
          </DialogTitle>
          <DialogDescription>
            通过 iframe URL 嵌入第三方游戏。创建后可在编辑页补充多语言信息、玩法说明、相关推荐等。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-iframe-game"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              URL 标识，仅限小写字母、数字和连字符
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>标题</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="游戏标题（默认同时作为中英文标题）"
            />
          </div>

          <div className="space-y-1.5">
            <Label>iframe URL</Label>
            <Input
              value={iframeUrl}
              onChange={(e) => setIframeUrl(e.target.value)}
              placeholder="https://example.com/game/index.html"
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              游戏将通过 iframe 嵌入此 URL
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>分类</Label>
              <Select
                value={category}
                onValueChange={(v) => setCategory(v as GameCategory)}
              >
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
              <Label>封面图 URL（可选）</Label>
              <Input
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            type="button"
            onClick={() => setOpen(false)}
            disabled={creating}
          >
            取消
          </Button>
          <Button onClick={onCreate} disabled={creating}>
            {creating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Plus className="size-4" />
            )}
            {creating ? "创建中..." : "创建"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
