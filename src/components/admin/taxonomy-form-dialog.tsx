"use client";

import { useState } from "react";
import { Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

import type { CollectionLayout, TaxonomyLocale } from "@/types";
import { COLLECTION_LAYOUTS } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ImageUploader } from "@/components/admin/image-uploader";

const LAYOUT_LABELS: Record<CollectionLayout, string> = {
  grid: "网格",
  list: "列表",
  carousel: "轮播",
  hero: "焦点图",
};

const EMPTY_LOCALE: TaxonomyLocale = {
  en: { name: "", description: "", seoTitle: "", seoDescription: "" },
  zh: { name: "", description: "", seoTitle: "", seoDescription: "" },
};

export interface TaxonomyFormInitialData {
  id: string;
  slug: string;
  name: string;
  locale: TaxonomyLocale;
  icon: string;
  color: string;
  coverImage?: string;
  layout?: CollectionLayout;
  sortOrder: number;
  isVisible: boolean;
}

interface TaxonomyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = 创建模式，对象 = 编辑模式 */
  initialData?: TaxonomyFormInitialData | null;
  /** API 基础路径，例如 "/api/admin/categories" */
  apiBase: string;
  /** 是否有封面图（分类/专题 有，标签 无） */
  hasCoverImage?: boolean;
  /** 是否有布局字段（仅专题） */
  hasLayout?: boolean;
  /** 弹窗标题（创建/编辑） */
  title: string;
  /** 描述文字 */
  description?: string;
  /** 保存成功后的回调（通常为 router.refresh） */
  onSuccess: () => void;
}

/**
 * 分类 / 标签 / 专题 通用的创建/编辑表单弹窗。
 * - 创建模式：POST apiBase
 * - 编辑模式：PATCH apiBase/[id]
 * - 多语言信息通过 Tabs 切换中英文
 *
 * 内部表单通过 key 重新挂载以同步 initialData，避免在 effect 中 setState。
 */
export function TaxonomyFormDialog({
  open,
  onOpenChange,
  initialData,
  apiBase,
  hasCoverImage = false,
  hasLayout = false,
  title,
  description,
  onSuccess,
}: TaxonomyFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>
        {open ? (
          <TaxonomyForm
            key={initialData?.id ?? "create"}
            initialData={initialData ?? null}
            apiBase={apiBase}
            hasCoverImage={hasCoverImage}
            hasLayout={hasLayout}
            onSaved={() => {
              onOpenChange(false);
              onSuccess();
            }}
            onCancel={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

interface TaxonomyFormProps {
  initialData: TaxonomyFormInitialData | null;
  apiBase: string;
  hasCoverImage: boolean;
  hasLayout: boolean;
  onSaved: () => void;
  onCancel: () => void;
}

function TaxonomyForm({
  initialData,
  apiBase,
  hasCoverImage,
  hasLayout,
  onSaved,
  onCancel,
}: TaxonomyFormProps) {
  const isEdit = !!initialData;
  const loc = initialData?.locale ?? EMPTY_LOCALE;

  // 通过 lazy initializer 直接从 initialData 初始化，无需 effect
  const [saving, setSaving] = useState(false);
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [name, setName] = useState(initialData?.name ?? "");
  const [icon, setIcon] = useState(initialData?.icon ?? "");
  const [color, setColor] = useState(initialData?.color ?? "");
  const [coverImage, setCoverImage] = useState(initialData?.coverImage ?? "");
  const [layout, setLayout] = useState<CollectionLayout>(
    initialData?.layout ?? "grid",
  );
  const [sortOrder, setSortOrder] = useState(initialData?.sortOrder ?? 0);
  const [isVisible, setIsVisible] = useState(initialData?.isVisible ?? true);

  const [zhName, setZhName] = useState(loc.zh?.name ?? "");
  const [zhDesc, setZhDesc] = useState(loc.zh?.description ?? "");
  const [zhSeoTitle, setZhSeoTitle] = useState(loc.zh?.seoTitle ?? "");
  const [zhSeoDesc, setZhSeoDesc] = useState(loc.zh?.seoDescription ?? "");
  const [enName, setEnName] = useState(loc.en?.name ?? "");
  const [enDesc, setEnDesc] = useState(loc.en?.description ?? "");
  const [enSeoTitle, setEnSeoTitle] = useState(loc.en?.seoTitle ?? "");
  const [enSeoDesc, setEnSeoDesc] = useState(loc.en?.seoDescription ?? "");

  async function onSave() {
    if (saving) return;
    if (!slug.trim()) {
      toast.error("Slug 不能为空");
      return;
    }
    if (!name.trim()) {
      toast.error("名称不能为空");
      return;
    }
    setSaving(true);
    const payload: Record<string, unknown> = {
      slug,
      name,
      icon,
      color,
      sortOrder: Number(sortOrder) || 0,
      isVisible,
      locale: {
        zh: {
          name: zhName,
          description: zhDesc,
          seoTitle: zhSeoTitle,
          seoDescription: zhSeoDesc,
        },
        en: {
          name: enName,
          description: enDesc,
          seoTitle: enSeoTitle,
          seoDescription: enSeoDesc,
        },
      },
    };
    if (hasCoverImage) payload.coverImage = coverImage;
    if (hasLayout) payload.layout = layout;

    try {
      const url = isEdit ? `${apiBase}/${initialData!.id}` : apiBase;
      const method = isEdit ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !data.success) {
        toast.error(data?.error?.message ?? "保存失败");
        return;
      }
      toast.success(isEdit ? "保存成功" : "创建成功");
      onSaved();
    } catch {
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="space-y-4">
        {/* 基本信息卡片 */}
        <Card>
          <CardHeader>
            <CardTitle>基本信息</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Slug</Label>
              <Input
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="my-category"
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                URL 标识，仅限小写字母、数字和连字符
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>名称（回退）</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="默认显示名称"
              />
              <p className="text-xs text-muted-foreground">
                当多语言名称缺失时使用
              </p>
            </div>
            <div className="space-y-1.5">
              <Label>图标</Label>
              <Input
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                placeholder="lucide 图标名，如 Gamepad2"
                className="font-mono"
              />
            </div>
            <div className="space-y-1.5">
              <Label>颜色</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#6366f1"
                  className="font-mono"
                />
                {color ? (
                  <span
                    className="size-7 shrink-0 rounded-md border"
                    style={{ backgroundColor: color }}
                  />
                ) : null}
              </div>
            </div>
            {hasLayout ? (
              <div className="space-y-1.5">
                <Label>布局</Label>
                <Select
                  value={layout}
                  onValueChange={(v) => setLayout(v as CollectionLayout)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COLLECTION_LAYOUTS.map((l) => (
                      <SelectItem key={l} value={l}>
                        {LAYOUT_LABELS[l]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-1.5">
              <Label>排序</Label>
              <Input
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
                max={9999}
              />
              <p className="text-xs text-muted-foreground">数字越小越靠前</p>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3 sm:col-span-2">
              <div className="space-y-0.5">
                <Label>是否可见</Label>
                <p className="text-xs text-muted-foreground">
                  关闭后不会在 C 端展示
                </p>
              </div>
              <Switch checked={isVisible} onCheckedChange={setIsVisible} />
            </div>
          </CardContent>
        </Card>

        {/* 封面图 */}
        {hasCoverImage ? (
          <Card>
            <CardHeader>
              <CardTitle>封面图</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
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
            </CardContent>
          </Card>
        ) : null}

        {/* 多语言信息 */}
        <Card>
          <CardHeader>
            <CardTitle>多语言信息</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="zh">
              <TabsList>
                <TabsTrigger value="zh">中文</TabsTrigger>
                <TabsTrigger value="en">英文</TabsTrigger>
              </TabsList>
              <TabsContent value="zh" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label>名称</Label>
                  <Input
                    value={zhName}
                    onChange={(e) => setZhName(e.target.value)}
                    placeholder="中文名称"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>描述</Label>
                  <Textarea
                    value={zhDesc}
                    onChange={(e) => setZhDesc(e.target.value)}
                    placeholder="中文描述"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SEO 标题</Label>
                  <Input
                    value={zhSeoTitle}
                    onChange={(e) => setZhSeoTitle(e.target.value)}
                    placeholder="留空则使用名称"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SEO 描述</Label>
                  <Textarea
                    value={zhSeoDesc}
                    onChange={(e) => setZhSeoDesc(e.target.value)}
                    placeholder="留空则使用描述"
                    rows={2}
                  />
                </div>
              </TabsContent>
              <TabsContent value="en" className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input
                    value={enName}
                    onChange={(e) => setEnName(e.target.value)}
                    placeholder="English name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <Textarea
                    value={enDesc}
                    onChange={(e) => setEnDesc(e.target.value)}
                    placeholder="English description"
                    rows={3}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SEO Title</Label>
                  <Input
                    value={enSeoTitle}
                    onChange={(e) => setEnSeoTitle(e.target.value)}
                    placeholder="Leave empty to use name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>SEO Description</Label>
                  <Textarea
                    value={enSeoDesc}
                    onChange={(e) => setEnSeoDesc(e.target.value)}
                    placeholder="Leave empty to use description"
                    rows={2}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          取消
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          保存
        </Button>
      </DialogFooter>
    </>
  );
}
