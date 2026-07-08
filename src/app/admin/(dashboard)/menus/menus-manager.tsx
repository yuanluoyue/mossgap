"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  ChevronDown,
  Folder,
  FileText,
} from "lucide-react";

import type { SysMenuRow } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { cn } from "@/lib/utils";

interface MenuNode extends SysMenuRow {
  children: MenuNode[];
}

interface MenusManagerProps {
  tree: MenuNode[];
  flatMenus: SysMenuRow[];
}

export function MenusManager({ tree, flatMenus }: MenusManagerProps) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string>("");

  async function handleCreate(parentId: string) {
    setCreateParentId(parentId);
    setCreateOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => handleCreate("")}>
          <Plus className="mr-1 size-4" />
          新增顶级菜单
        </Button>
      </div>

      <div className="rounded-xl border bg-background">
        <div className="border-b px-4 py-3">
          <div className="grid grid-cols-[1fr_180px_140px_120px_80px_120px] gap-3 text-xs font-medium text-muted-foreground">
            <div>名称</div>
            <div>路径</div>
            <div>图标</div>
            <div>排序</div>
            <div>显示</div>
            <div className="text-right">操作</div>
          </div>
        </div>
        <div className="divide-y">
          {tree.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              暂无菜单，点击右上角新增
            </div>
          ) : (
            tree.map((node) => (
              <MenuRow
                key={node.id}
                node={node}
                depth={0}
                flatMenus={flatMenus}
                onRefresh={() => router.refresh()}
                onCreateChild={handleCreate}
              />
            ))
          )}
        </div>
      </div>

      <MenuFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        flatMenus={flatMenus}
        defaultParentId={createParentId}
        onDone={() => router.refresh()}
      />
    </div>
  );
}

interface MenuRowProps {
  node: MenuNode;
  depth: number;
  flatMenus: SysMenuRow[];
  onRefresh: () => void;
  onCreateChild: (parentId: string) => void;
}

function MenuRow({ node, depth, flatMenus, onRefresh, onCreateChild }: MenuRowProps) {
  const [expanded, setExpanded] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [visSaving, setVisSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasChildren = node.children.length > 0;

  async function handleToggleVisible(checked: boolean) {
    setVisSaving(true);
    try {
      const res = await fetch(`/api/sys/menus/${node.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isVisible: checked }),
      });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "更新失败");
        return;
      }
      toast.success(checked ? "已显示菜单" : "已隐藏菜单");
      onRefresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setVisSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/sys/menus/${node.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除菜单");
      onRefresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <div
        className="grid grid-cols-[1fr_180px_140px_120px_80px_120px] items-center gap-3 px-4 py-2.5 hover:bg-muted/30"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <div className="flex items-center gap-2 min-w-0">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex size-5 items-center justify-center text-muted-foreground hover:text-foreground"
            >
              {expanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          ) : (
            <span className="size-5" />
          )}
          {node.path ? (
            <FileText className="size-4 shrink-0 text-muted-foreground" />
          ) : (
            <Folder className="size-4 shrink-0 text-amber-500" />
          )}
          <span className="truncate text-sm font-medium">{node.name}</span>
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground" title={node.path ?? ""}>
          {node.path ?? "—"}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {node.icon ?? "—"}
        </div>
        <div className="text-sm text-muted-foreground tabular-nums">{node.sortOrder}</div>
        <div>
          <Switch
            checked={node.isVisible}
            disabled={visSaving}
            onCheckedChange={handleToggleVisible}
            size="sm"
          />
        </div>
        <div className="flex items-center justify-end gap-1">
          <ActionButton
            icon={Plus}
            label="新增子菜单"
            onClick={() => onCreateChild(node.id)}
          />
          <ActionButton
            icon={Pencil}
            label="编辑"
            onClick={() => setEditOpen(true)}
          />
          <ActionButton
            icon={Trash2}
            label="删除"
            variant="destructive"
            onClick={() => setDeleteOpen(true)}
          />
        </div>
      </div>

      {hasChildren && expanded && (
        <div className="divide-y border-l border-dashed ml-4">
          {node.children.map((child) => (
            <MenuRow
              key={child.id}
              node={child}
              depth={depth + 1}
              flatMenus={flatMenus}
              onRefresh={onRefresh}
              onCreateChild={onCreateChild}
            />
          ))}
        </div>
      )}

      <MenuFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        item={node}
        flatMenus={flatMenus}
        onDone={onRefresh}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除菜单"
        description={`确定要删除菜单 "${node.name}" 吗？子菜单将一并删除。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </>
  );
}

interface MenuFormDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  mode: "create" | "edit";
  item?: SysMenuRow;
  flatMenus: SysMenuRow[];
  defaultParentId?: string;
  onDone: () => void;
}

function MenuFormDialog({
  open,
  onOpenChange,
  mode,
  item,
  flatMenus,
  defaultParentId,
  onDone,
}: MenuFormDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(item?.name ?? "");
  const [path, setPath] = useState(item?.path ?? "");
  const [parentId, setParentId] = useState(item?.parentId ?? defaultParentId ?? "");
  const [icon, setIcon] = useState(item?.icon ?? "");
  const [sortOrder, setSortOrder] = useState(item?.sortOrder ?? 0);
  const [isVisible, setIsVisible] = useState(item?.isVisible ?? true);

  // 编辑模式下排除自身及子孙，避免循环
  const parentOptions = useMemo(() => {
    const banned = new Set<string>();
    if (mode === "edit" && item) {
      banned.add(item.id);
      // 递归收集所有子孙
      const collect = (id: string) => {
        for (const m of flatMenus) {
          if (m.parentId === id) {
            banned.add(m.id);
            collect(m.id);
          }
        }
      };
      collect(item.id);
    }
    return flatMenus.filter((m) => !banned.has(m.id));
  }, [mode, item, flatMenus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        name,
        path: path || null,
        parentId: parentId || null,
        icon: icon || null,
        sortOrder,
        isVisible,
      };
      const res = mode === "create"
        ? await fetch("/api/sys/menus", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/sys/menus/${item!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "保存失败");
        return;
      }
      toast.success(mode === "create" ? "已创建菜单" : "已更新菜单");
      onOpenChange(false);
      onDone();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "新增菜单" : "编辑菜单"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "父级菜单 path 留空仅作分组容器"
              : "修改菜单信息"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="menu-name">名称 *</Label>
            <Input
              id="menu-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={64}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-path">路径</Label>
            <Input
              id="menu-path"
              value={path}
              onChange={(e) => setPath(e.target.value)}
              placeholder="如 /admin/users（留空表示分组容器）"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-parent">父级菜单</Label>
            <Select value={parentId} onValueChange={setParentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="顶级菜单" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">（顶级）</SelectItem>
                {parentOptions.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="menu-icon">图标</Label>
            <Input
              id="menu-icon"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="lucide 图标名，如 LayoutDashboard"
            />
            <p className="text-xs text-muted-foreground">
              使用 lucide-react 图标名，参考 lucide.dev/icons
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="menu-sort">排序</Label>
              <Input
                id="menu-sort"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(Number(e.target.value))}
                min={0}
              />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Switch
                checked={isVisible}
                onCheckedChange={setIsVisible}
                id="menu-visible"
              />
              <Label htmlFor="menu-visible" className="cursor-pointer text-sm">
                显示
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              取消
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
