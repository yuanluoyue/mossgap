"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Folder, FileText, ChevronRight, ChevronDown } from "lucide-react";

import type { SysMenuRow, AdminRole } from "@/db/queries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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

interface RolesActionsProps {
  mode: "create" | "edit";
  role?: AdminRole;
  menus: SysMenuRow[];
}

export function RolesActions({ mode, role, menus }: RolesActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [name, setName] = useState(role?.name ?? "");
  const [code, setCode] = useState(role?.code ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [sortOrder, setSortOrder] = useState(role?.sortOrder ?? 0);
  const [isActive, setIsActive] = useState(role?.isActive ?? true);
  const [selectedMenuIds, setSelectedMenuIds] = useState<Set<string>>(
    new Set(role?.menuIds ?? []),
  );

  // 构建菜单树
  const menuTree = useMemo(() => buildTree(menus), [menus]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const body = {
        name,
        code,
        description,
        sortOrder,
        isActive,
        menuIds: Array.from(selectedMenuIds),
      };
      const res = mode === "create"
        ? await fetch("/api/sys/roles", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch(`/api/sys/roles/${role!.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "保存失败");
        return;
      }
      toast.success(mode === "create" ? "已创建角色" : "已更新角色");
      setOpen(false);
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/sys/roles/${role!.id}`, { method: "DELETE" });
      const json = (await res.json()) as { success?: boolean; data?: any; error?: { message?: string } };
      if (!res.ok || !json.success) {
        toast.error(json.error?.message ?? "删除失败");
        return;
      }
      toast.success("已删除角色");
      router.refresh();
    } catch {
      toast.error("网络错误");
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "create") {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-1 size-4" />
          新增角色
        </Button>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>新增角色</DialogTitle>
            <DialogDescription>创建角色并分配菜单权限</DialogDescription>
          </DialogHeader>
          <RoleFormBody
            name={name}
            setName={setName}
            code={code}
            setCode={setCode}
            description={description}
            setDescription={setDescription}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            isActive={isActive}
            setIsActive={setIsActive}
            menuTree={menuTree}
            selectedMenuIds={selectedMenuIds}
            setSelectedMenuIds={setSelectedMenuIds}
            onSubmit={handleSubmit}
            submitting={submitting}
            onCancel={() => setOpen(false)}
            mode={mode}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Dialog open={open} onOpenChange={setOpen}>
        <ActionButton
          icon={Pencil}
          label="编辑"
          onClick={() => setOpen(true)}
        />
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>编辑角色</DialogTitle>
            <DialogDescription>修改 &quot;{role!.name}&quot; 的信息和权限</DialogDescription>
          </DialogHeader>
          <RoleFormBody
            name={name}
            setName={setName}
            code={code}
            setCode={setCode}
            description={description}
            setDescription={setDescription}
            sortOrder={sortOrder}
            setSortOrder={setSortOrder}
            isActive={isActive}
            setIsActive={setIsActive}
            menuTree={menuTree}
            selectedMenuIds={selectedMenuIds}
            setSelectedMenuIds={setSelectedMenuIds}
            onSubmit={handleSubmit}
            submitting={submitting}
            onCancel={() => setOpen(false)}
            mode={mode}
          />
        </DialogContent>
      </Dialog>

      <ActionButton
        icon={Trash2}
        label="删除"
        variant="destructive"
        onClick={() => setDeleteOpen(true)}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="删除角色"
        description={`确定要删除角色 "${role!.name}" 吗？已分配该角色的用户将失去对应权限。`}
        confirmText="删除"
        onConfirm={handleDelete}
      />
    </div>
  );
}

interface RoleFormBodyProps {
  name: string;
  setName: (v: string) => void;
  code: string;
  setCode: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  sortOrder: number;
  setSortOrder: (v: number) => void;
  isActive: boolean;
  setIsActive: (v: boolean) => void;
  menuTree: MenuTreeNode[];
  selectedMenuIds: Set<string>;
  setSelectedMenuIds: (v: Set<string>) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting: boolean;
  onCancel: () => void;
  mode: "create" | "edit";
}

function RoleFormBody(props: RoleFormBodyProps) {
  return (
    <form onSubmit={props.onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role-name">名称 *</Label>
          <Input
            id="role-name"
            value={props.name}
            onChange={(e) => props.setName(e.target.value)}
            required
            maxLength={64}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="role-code">编码 *</Label>
          <Input
            id="role-code"
            value={props.code}
            onChange={(e) => props.setCode(e.target.value)}
            required
            maxLength={64}
            disabled={props.mode === "edit"}
            placeholder="如 editor"
          />
          <p className="text-xs text-muted-foreground">编辑模式不可修改编码</p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="role-desc">说明</Label>
        <Textarea
          id="role-desc"
          value={props.description}
          onChange={(e) => props.setDescription(e.target.value)}
          rows={2}
          maxLength={500}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="role-sort">排序</Label>
          <Input
            id="role-sort"
            type="number"
            value={props.sortOrder}
            onChange={(e) => props.setSortOrder(Number(e.target.value))}
            min={0}
          />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch
            checked={props.isActive}
            onCheckedChange={props.setIsActive}
            id="role-active"
          />
          <Label htmlFor="role-active" className="cursor-pointer text-sm">
            启用
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label>菜单权限</Label>
        <div className="max-h-[320px] overflow-y-auto rounded-md border p-3">
          <MenuCheckboxTree
            nodes={props.menuTree}
            selectedMenuIds={props.selectedMenuIds}
            setSelectedMenuIds={props.setSelectedMenuIds}
          />
        </div>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={props.onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={props.submitting}>
          {props.submitting ? "保存中..." : "保存"}
        </Button>
      </DialogFooter>
    </form>
  );
}

interface MenuTreeNode extends SysMenuRow {
  children: MenuTreeNode[];
}

function buildTree(menus: SysMenuRow[]): MenuTreeNode[] {
  const map = new Map<string, MenuTreeNode>();
  const roots: MenuTreeNode[] = [];
  for (const m of menus) {
    map.set(m.id, { ...m, children: [] });
  }
  for (const m of menus) {
    const node = map.get(m.id)!;
    if (m.parentId && map.has(m.parentId)) {
      map.get(m.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

interface MenuCheckboxTreeProps {
  nodes: MenuTreeNode[];
  selectedMenuIds: Set<string>;
  setSelectedMenuIds: (v: Set<string>) => void;
}

function MenuCheckboxTree({ nodes, selectedMenuIds, setSelectedMenuIds }: MenuCheckboxTreeProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <MenuCheckboxNode
          key={node.id}
          node={node}
          depth={0}
          selectedMenuIds={selectedMenuIds}
          setSelectedMenuIds={setSelectedMenuIds}
        />
      ))}
    </div>
  );
}

interface MenuCheckboxNodeProps {
  node: MenuTreeNode;
  depth: number;
  selectedMenuIds: Set<string>;
  setSelectedMenuIds: (v: Set<string>) => void;
}

function MenuCheckboxNode({ node, depth, selectedMenuIds, setSelectedMenuIds }: MenuCheckboxNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;

  // 收集所有后代菜单 ID（用于全选/取消全选）
  const descendantIds = useMemo(() => {
    const ids: string[] = [];
    const collect = (n: MenuTreeNode) => {
      for (const child of n.children) {
        ids.push(child.id);
        collect(child);
      }
    };
    collect(node);
    return ids;
  }, [node]);

  const checkedDescendants = descendantIds.filter((id) => selectedMenuIds.has(id)).length;
  const isSelfChecked = selectedMenuIds.has(node.id);
  const isIndeterminate =
    hasChildren && checkedDescendants > 0 && checkedDescendants < descendantIds.length;
  const isAllChecked =
    isSelfChecked &&
    (!hasChildren || checkedDescendants === descendantIds.length);

  function getCheckedState(): boolean | "indeterminate" {
    if (isIndeterminate) return "indeterminate";
    return isAllChecked;
  }

  function handleToggle() {
    const next = new Set(selectedMenuIds);
    const shouldCheck = !isAllChecked;
    if (shouldCheck) {
      next.add(node.id);
      for (const id of descendantIds) next.add(id);
    } else {
      next.delete(node.id);
      for (const id of descendantIds) next.delete(id);
    }
    setSelectedMenuIds(next);
  }

  return (
    <div>
      <div
        className="flex items-center gap-2 py-1"
        style={{ paddingLeft: `${depth * 20}px` }}
      >
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
        <Checkbox
          checked={getCheckedState()}
          onCheckedChange={handleToggle}
        />
        {node.path ? (
          <FileText className="size-3.5 text-muted-foreground" />
        ) : (
          <Folder className="size-3.5 text-amber-500" />
        )}
        <span className="text-sm">{node.name}</span>
        {node.path && (
          <span className="text-xs text-muted-foreground">{node.path}</span>
        )}
      </div>
      {hasChildren && expanded && (
        <div>
          {node.children.map((child) => (
            <MenuCheckboxNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedMenuIds={selectedMenuIds}
              setSelectedMenuIds={setSelectedMenuIds}
            />
          ))}
        </div>
      )}
    </div>
  );
}
