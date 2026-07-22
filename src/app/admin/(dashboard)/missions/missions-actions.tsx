"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

import type { MissionItem, LocalizedText } from "@/db/queries";
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
  { value: "daily", label: "每日任务" },
  { value: "weekly", label: "每周任务" },
  { value: "achievement", label: "成就" },
];

const EVENT_OPTIONS = [
  { value: "__none__", label: "无（手动触发）" },
  { value: "LOGIN", label: "LOGIN（登录签到）" },
  { value: "GAME_FINISH", label: "GAME_FINISH（游戏结束）" },
];

const REWARD_TYPE_OPTIONS = [
  { value: "point", label: "积分" },
];

/** 将 ISO 时间字符串转换为 datetime-local input 所需的值。 */
function isoToLocal(iso: string): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

/** 将 datetime-local input 值转换为 unix 秒。 */
function localToUnix(local: string): number | null {
  if (!local) return null;
  const t = new Date(local).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor(t / 1000);
}

function emptyLocalized(): LocalizedText {
  return { en: "", zh: "" };
}

interface MissionsActionsProps {
  mode: "create" | "edit";
  mission?: MissionItem;
}

export function MissionsActions({ mode, mission }: MissionsActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // 表单字段
  const [name, setName] = useState<LocalizedText>(mission?.name ?? emptyLocalized());
  const [description, setDescription] = useState<LocalizedText>(
    mission?.description ?? emptyLocalized(),
  );
  const [type, setType] = useState<string>(mission?.type ?? "daily");
  const [event, setEvent] = useState<string>(mission?.event ?? "__none__");
  const [target, setTarget] = useState(String(mission?.target ?? 1));
  const [rewardType, setRewardType] = useState<string>(mission?.rewardType ?? "point");
  const [rewardValue, setRewardValue] = useState(String(mission?.rewardValue ?? 0));
  const [icon, setIcon] = useState(mission?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(String(mission?.sortOrder ?? 0));
  const [enabled, setEnabled] = useState(mission?.enabled ?? true);
  const [startAt, setStartAt] = useState(isoToLocal(mission?.startAt ?? ""));
  const [endAt, setEndAt] = useState(isoToLocal(mission?.endAt ?? ""));

  function resetForm() {
    setName(mission?.name ?? emptyLocalized());
    setDescription(mission?.description ?? emptyLocalized());
    setType(mission?.type ?? "daily");
    setEvent(mission?.event ?? "__none__");
    setTarget(String(mission?.target ?? 1));
    setRewardType(mission?.rewardType ?? "point");
    setRewardValue(String(mission?.rewardValue ?? 0));
    setIcon(mission?.icon ?? "");
    setSortOrder(String(mission?.sortOrder ?? 0));
    setEnabled(mission?.enabled ?? true);
    setStartAt(isoToLocal(mission?.startAt ?? ""));
    setEndAt(isoToLocal(mission?.endAt ?? ""));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) resetForm();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.en.trim()) {
      toast.error("英文名称不能为空");
      return;
    }
    setSubmitting(true);
    try {
      const payload = {
        name: { en: name.en.trim(), zh: name.zh.trim() },
        description: {
          en: description.en.trim(),
          zh: description.zh.trim(),
        },
        type,
        event: event === "__none__" ? null : event,
        target: Number(target) || 1,
        rewardType,
        rewardValue: Number(rewardValue) || 0,
        icon: icon.trim() || null,
        sortOrder: Number(sortOrder) || 0,
        enabled,
        startAt: localToUnix(startAt),
        endAt: localToUnix(endAt),
      };

      const url = mode === "create"
        ? "/api/admin/missions"
        : `/api/admin/missions/${mission?.id}`;
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
      toast.success(mode === "create" ? "已创建任务" : "已更新任务");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!mission) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/admin/missions/${mission.id}`, {
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
      toast.success("已删除任务");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  // 删除确认展示用名称（英文优先）
  const deleteLabel = mission ? pickLocalized(mission.name, "en") : "";

  // 创建模式：仅一个按钮
  if (mode === "create") {
    return (
      <>
        <Button onClick={() => setOpen(true)} className="gap-1.5">
          <Plus className="size-4" />
          新建任务
        </Button>
        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>新建任务</DialogTitle>
              <DialogDescription>
                创建一个新的任务，配置类型、事件、目标和奖励。任务会在用户触发对应事件时按周期懒创建。
              </DialogDescription>
            </DialogHeader>
            <MissionForm
              submitting={submitting}
              onSubmit={handleSubmit}
              onCancel={() => setOpen(false)}
              fields={{
                name, description, type, event, target, rewardType,
                rewardValue, icon, sortOrder, enabled, startAt, endAt,
              }}
              setters={{
                setName, setDescription, setType, setEvent, setTarget,
                setRewardType, setRewardValue, setIcon, setSortOrder,
                setEnabled, setStartAt, setEndAt,
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
            <DialogTitle>编辑任务</DialogTitle>
            <DialogDescription>
              修改任务配置。已发放给用户的进度记录不会回滚，请谨慎调整目标值。
            </DialogDescription>
          </DialogHeader>
          <MissionForm
            submitting={submitting}
            onSubmit={handleSubmit}
            onCancel={() => setOpen(false)}
            fields={{
              name, description, type, event, target, rewardType,
              rewardValue, icon, sortOrder, enabled, startAt, endAt,
            }}
            setters={{
              setName, setDescription, setType, setEvent, setTarget,
              setRewardType, setRewardValue, setIcon, setSortOrder,
              setEnabled, setStartAt, setEndAt,
            }}
          />
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除任务"
        description={`确定要删除任务 "${deleteLabel}" 吗？该任务关联的用户进度记录将一并删除，此操作不可撤销。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}

// ─── 表单字段类型 ──────────────────────────────────

interface MissionFormFields {
  name: LocalizedText;
  description: LocalizedText;
  type: string;
  event: string;
  target: string;
  rewardType: string;
  rewardValue: string;
  icon: string;
  sortOrder: string;
  enabled: boolean;
  startAt: string;
  endAt: string;
}

interface MissionFormSetters {
  setName: (v: LocalizedText) => void;
  setDescription: (v: LocalizedText) => void;
  setType: (v: string) => void;
  setEvent: (v: string) => void;
  setTarget: (v: string) => void;
  setRewardType: (v: string) => void;
  setRewardValue: (v: string) => void;
  setIcon: (v: string) => void;
  setSortOrder: (v: string) => void;
  setEnabled: (v: boolean) => void;
  setStartAt: (v: string) => void;
  setEndAt: (v: string) => void;
}

interface MissionFormProps {
  submitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
  fields: MissionFormFields;
  setters: MissionFormSetters;
}

function MissionForm({
  submitting,
  onSubmit,
  onCancel,
  fields,
  setters,
}: MissionFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* 名称 - 双语 */}
      <div className="space-y-2">
        <Label>任务名称 *</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="mission-name-en" className="text-xs text-muted-foreground">
              English *
            </Label>
            <Input
              id="mission-name-en"
              value={fields.name.en}
              onChange={(e) =>
                setters.setName({ ...fields.name, en: e.target.value })
              }
              maxLength={120}
              placeholder="Daily Check-in"
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mission-name-zh" className="text-xs text-muted-foreground">
              中文
            </Label>
            <Input
              id="mission-name-zh"
              value={fields.name.zh}
              onChange={(e) =>
                setters.setName({ ...fields.name, zh: e.target.value })
              }
              maxLength={120}
              placeholder="每日签到"
            />
          </div>
        </div>
      </div>

      {/* 描述 - 双语 */}
      <div className="space-y-2">
        <Label>描述</Label>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label htmlFor="mission-desc-en" className="text-xs text-muted-foreground">
              English
            </Label>
            <Textarea
              id="mission-desc-en"
              value={fields.description.en}
              onChange={(e) =>
                setters.setDescription({ ...fields.description, en: e.target.value })
              }
              maxLength={2000}
              placeholder="Mission description shown to user"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mission-desc-zh" className="text-xs text-muted-foreground">
              中文
            </Label>
            <Textarea
              id="mission-desc-zh"
              value={fields.description.zh}
              onChange={(e) =>
                setters.setDescription({ ...fields.description, zh: e.target.value })
              }
              maxLength={2000}
              placeholder="任务说明，会展示给用户"
              rows={2}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>类型 *</Label>
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
        <div className="space-y-2">
          <Label>触发事件</Label>
          <Select value={fields.event} onValueChange={setters.setEvent}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择事件" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {EVENT_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mission-target">目标值</Label>
          <Input
            id="mission-target"
            type="number"
            inputMode="numeric"
            min={1}
            value={fields.target}
            onChange={(e) => setters.setTarget(e.target.value)}
            placeholder="1"
          />
        </div>
        <div className="space-y-2">
          <Label>奖励类型</Label>
          <Select value={fields.rewardType} onValueChange={setters.setRewardType}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="选择奖励" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4}>
              {REWARD_TYPE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="mission-reward">奖励数值</Label>
          <Input
            id="mission-reward"
            type="number"
            inputMode="numeric"
            min={0}
            value={fields.rewardValue}
            onChange={(e) => setters.setRewardValue(e.target.value)}
            placeholder="0"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mission-icon">图标（emoji 或 URL）</Label>
          <Input
            id="mission-icon"
            value={fields.icon}
            onChange={(e) => setters.setIcon(e.target.value)}
            maxLength={255}
            placeholder="🎁 或 /icons/daily.png"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mission-sort">排序</Label>
          <Input
            id="mission-sort"
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

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="mission-start">开始时间</Label>
          <Input
            id="mission-start"
            type="datetime-local"
            value={fields.startAt}
            onChange={(e) => setters.setStartAt(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mission-end">结束时间</Label>
          <Input
            id="mission-end"
            type="datetime-local"
            value={fields.endAt}
            onChange={(e) => setters.setEndAt(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          checked={fields.enabled}
          onCheckedChange={setters.setEnabled}
          id="mission-enabled"
        />
        <Label htmlFor="mission-enabled" className="cursor-pointer text-sm">
          启用（关闭后用户端不再展示该任务，也不会触发进度）
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

interface MissionEnabledSwitchProps {
  missionId: string;
  enabled: boolean;
}

export function MissionEnabledSwitch({
  missionId,
  enabled,
}: MissionEnabledSwitchProps) {
  const router = useRouter();
  const [checked, setChecked] = useState(enabled);
  const [saving, setSaving] = useState(false);

  async function handleToggle(value: boolean) {
    setSaving(true);
    const prev = checked;
    setChecked(value);
    try {
      const res = await fetch(`/api/admin/missions/${missionId}`, {
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
