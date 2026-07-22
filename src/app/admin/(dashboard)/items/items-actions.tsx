"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import type { ItemTemplateItem, LocalizedText } from "@/db/queries";
import { pickLocalized } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ActionButton } from "@/components/admin/action-button";
import { ImageUploader } from "@/components/admin/image-uploader";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const TYPE_OPTIONS = [
  { value: "consumable", label: "consumable（消耗品）" },
  { value: "material", label: "material（材料）" },
  { value: "gift", label: "gift（礼物）" },
  { value: "currency", label: "currency（货币）" },
  { value: "equipment", label: "equipment（装备）" },
];

const RARITY_OPTIONS = [
  { value: "common", label: "common（普通）" },
  { value: "rare", label: "rare（稀有）" },
  { value: "epic", label: "epic（史诗）" },
  { value: "legendary", label: "legendary（传说）" },
];

function emptyLocalized(): LocalizedText {
  return { en: "", zh: "" };
}

interface ItemsActionsProps {
  mode: "create" | "edit";
  item?: ItemTemplateItem;
}

export function ItemsActions({ mode, item }: ItemsActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单字段
  const [code, setCode] = useState(item?.code ?? "");
  const [type, setType] = useState(item?.type ?? "consumable");
  const [name, setName] = useState<LocalizedText>(item?.name ?? emptyLocalized());
  const [description, setDescription] = useState<LocalizedText>(
    item?.description ?? emptyLocalized(),
  );
  const [icon, setIcon] = useState(item?.icon ?? "");
  const [rarity, setRarity] = useState(item?.rarity ?? "common");
  const [stackable, setStackable] = useState(item?.stackable ?? false);
  const [maxStack, setMaxStack] = useState(String(item?.maxStack ?? 0));
  const [enabled, setEnabled] = useState(item?.enabled ?? true);
  const [sortOrder, setSortOrder] = useState(String(item?.sortOrder ?? 0));

  function resetForm() {
    setCode(item?.code ?? "");
    setType(item?.type ?? "consumable");
    setName(item?.name ?? emptyLocalized());
    setDescription(item?.description ?? emptyLocalized());
    setIcon(item?.icon ?? "");
    setRarity(item?.rarity ?? "common");
    setStackable(item?.stackable ?? false);
    setMaxStack(String(item?.maxStack ?? 0));
    setEnabled(item?.enabled ?? true);
    setSortOrder(String(item?.sortOrder ?? 0));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      toast.error("code 不能为空");
      return;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(code.trim())) {
      toast.error("code 只能包含小写字母、数字和下划线，且以字母开头");
      return;
    }
    if (!name.en.trim()) {
      toast.error("英文名称不能为空");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        code: code.trim(),
        type,
        name: { en: name.en.trim(), zh: name.zh.trim() },
        description: {
          en: description.en.trim(),
          zh: description.zh.trim(),
        },
        icon: icon.trim() || null,
        rarity,
        stackable,
        maxStack: Number(maxStack) || 0,
        enabled,
        sortOrder: Number(sortOrder) || 0,
      };

      const url = mode === "create"
        ? "/api/admin/items"
        : `/api/admin/items/${item?.id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "保存失败");
        return;
      }
      toast.success(mode === "create" ? "已创建物品" : "已更新物品");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!item) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/items/${item.id}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除物品");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  // 删除确认展示用名称（英文优先）
  const deleteLabel = item ? pickLocalized(item.name, "en") : "";

  // 创建模式：仅一个按钮
  if (mode === "create") {
    return (
      <>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          新建物品
        </Button>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新建物品</DialogTitle>
              <DialogDescription>
                创建一个新的物品模板，配置 code、类型、名称和图标。code 必须唯一且创建后不建议修改。
              </DialogDescription>
            </DialogHeader>
            <ItemForm
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => setOpen(false)}
              fields={{
                code, type, name, description, icon, rarity,
                stackable, maxStack, enabled, sortOrder,
              }}
              setters={{
                setCode, setType, setName, setDescription, setIcon,
                setRarity, setStackable, setMaxStack, setEnabled, setSortOrder,
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // 编辑模式：行内操作按钮组
  return (
    <div className="flex items-center justify-end gap-1">
      <ActionButton
        icon={Pencil}
        label="编辑"
        onClick={() => setOpen(true)}
      />
      <ActionButton
        icon={Trash2}
        label="删除"
        variant="destructive"
        onClick={() => setDeleteOpen(true)}
      />

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑物品</DialogTitle>
            <DialogDescription>
              修改物品配置。已有用户持有的物品记录不会删除，但禁用后 C 端不再展示。
            </DialogDescription>
          </DialogHeader>
          <ItemForm
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            fields={{
              code, type, name, description, icon, rarity,
              stackable, maxStack, enabled, sortOrder,
            }}
            setters={{
              setCode, setType, setName, setDescription, setIcon,
              setRarity, setStackable, setMaxStack, setEnabled, setSortOrder,
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除物品"
        description={`确定要删除物品 "${deleteLabel}" 吗？该物品关联的用户背包记录和变动日志将一并删除，此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── 表单字段类型 ──────────────────────────────────

interface ItemFormFields {
  code: string;
  type: string;
  name: LocalizedText;
  description: LocalizedText;
  icon: string;
  rarity: string;
  stackable: boolean;
  maxStack: string;
  enabled: boolean;
  sortOrder: string;
}

interface ItemFormSetters {
  setCode: (v: string) => void;
  setType: (v: string) => void;
  setName: (v: LocalizedText) => void;
  setDescription: (v: LocalizedText) => void;
  setIcon: (v: string) => void;
  setRarity: (v: string) => void;
  setStackable: (v: boolean) => void;
  setMaxStack: (v: string) => void;
  setEnabled: (v: boolean) => void;
  setSortOrder: (v: string) => void;
}

interface ItemFormProps {
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  fields: ItemFormFields;
  setters: ItemFormSetters;
}

function ItemForm({
  submitting,
  onSubmit,
  onCancel,
  fields,
  setters,
}: ItemFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* code + type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="item-code">code *</Label>
          <Input
            id="item-code"
            value={fields.code}
            onChange={(e) => setters.setCode(e.target.value)}
            maxLength={64}
            placeholder="coin_pack"
            required
          />
          <p className="text-xs text-muted-foreground">
            小写字母、数字、下划线，业务侧引用
          </p>
        </div>
        <div className="space-y-2">
          <Label>type *</Label>
          <Select value={fields.type} onValueChange={setters.setType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择类型" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* 名称 - 双语 */}
      <div className="space-y-2">
        <Label>物品名称 *</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="item-name-en" className="text-xs text-muted-foreground">
              English *
            </Label>
            <Input
              id="item-name-en"
              value={fields.name.en}
              onChange={(e) =>
                setters.setName({ ...fields.name, en: e.target.value })
              }
              maxLength={120}
              placeholder="Coin Pack"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="item-name-zh" className="text-xs text-muted-foreground">
              中文
            </Label>
            <Input
              id="item-name-zh"
              value={fields.name.zh}
              onChange={(e) =>
                setters.setName({ ...fields.name, zh: e.target.value })
              }
              maxLength={120}
              placeholder="金币包"
            />
          </div>
        </div>
      </div>

      {/* 描述 - 双语 */}
      <div className="space-y-2">
        <Label>描述</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="item-desc-en" className="text-xs text-muted-foreground">
              English
            </Label>
            <Textarea
              id="item-desc-en"
              value={fields.description.en}
              onChange={(e) =>
                setters.setDescription({ ...fields.description, en: e.target.value })
              }
              maxLength={2000}
              placeholder="Item description shown to user"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="item-desc-zh" className="text-xs text-muted-foreground">
              中文
            </Label>
            <Textarea
              id="item-desc-zh"
              value={fields.description.zh}
              onChange={(e) =>
                setters.setDescription({ ...fields.description, zh: e.target.value })
              }
              maxLength={2000}
              placeholder="物品说明，会展示给用户"
              rows={2}
            />
          </div>
        </div>
      </div>

      {/* 图标上传 */}
      <div className="space-y-2">
        <Label>物品图标</Label>
        <ImageUploader
          category="item"
          url={fields.icon}
          onUrlChange={(url) => setters.setIcon(url)}
        />
        <p className="text-xs text-muted-foreground">
          上传到 OSS 独立目录 images/items，与其他图片隔离
        </p>
      </div>

      {/* rarity + sortOrder */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>rarity</Label>
          <Select value={fields.rarity} onValueChange={setters.setRarity}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择稀有度" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {RARITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-sort">排序</Label>
          <Input
            id="item-sort"
            type="number"
            inputMode="numeric"
            min={0}
            max={9999}
            value={fields.sortOrder}
            onChange={(e) => setters.setSortOrder(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      {/* stackable + maxStack */}
      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center gap-2">
          <Switch
            checked={fields.stackable}
            onCheckedChange={setters.setStackable}
            id="item-stackable"
          />
          <Label htmlFor="item-stackable" className="cursor-pointer text-sm">
            可堆叠
          </Label>
        </div>
        <div className="space-y-2">
          <Label htmlFor="item-max-stack">最大堆叠数（0=不限）</Label>
          <Input
            id="item-max-stack"
            type="number"
            inputMode="numeric"
            min={0}
            value={fields.maxStack}
            onChange={(e) => setters.setMaxStack(e.target.value)}
            disabled={!fields.stackable}
            placeholder="0"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={fields.enabled}
          onCheckedChange={setters.setEnabled}
          id="item-enabled"
        />
        <Label htmlFor="item-enabled" className="cursor-pointer text-sm">
          启用（关闭后 C 端不再展示该物品）
        </Label>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : null}
          {submitting ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── 行内启用切换 Switch ──────────────────────────────────

interface ItemEnabledSwitchProps {
  itemId: string;
  enabled: boolean;
}

export function ItemEnabledSwitch({
  itemId,
  enabled,
}: ItemEnabledSwitchProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [saving, setSaving] = useState(false);

  async function handleToggle(value: boolean) {
    setSaving(true);
    const prev = checked;
    setChecked(value);
    try {
      const res = await fetch(`/api/admin/items/${itemId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: value }),
      });
      const json = (await res.json()) as {
        success?: boolean;
        error?: { message?: string };
      };
      if (!res.ok || !json.success) {
        setChecked(prev);
        toast.error(json.error?.message ?? "更新失败");
        return;
      }
      toast.success(value ? "已启用" : "已停用");
      router.refresh();
    } catch {
      setChecked(prev);
      toast.error("网络错误");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span>
          <Switch
            checked={checked}
            disabled={saving}
            onCheckedChange={handleToggle}
            size="sm"
          />
        </span>
      </TooltipTrigger>
      <TooltipContent side="top">
        {checked ? "点击停用" : "点击启用"}
      </TooltipContent>
    </Tooltip>
  );
}
