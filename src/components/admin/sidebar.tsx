"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gamepad2,
  LayoutDashboard,
  HardDrive,
  MessageSquare,
  FolderOpen,
  Shield,
  Users,
  UserCog,
  UserCircle,
  Settings,
  ScrollText,
  FolderTree,
  Tags,
  LayoutGrid,
  Target,
  Menu as MenuIcon,
  ChevronRight,
  ChevronDown,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/** 数据库中存储的 icon 字符串 → lucide 图标组件映射。 */
const ICON_MAP: Record<string, LucideIcon> = {
  LayoutDashboard,
  Gamepad2,
  HardDrive,
  MessageSquare,
  FolderOpen,
  Shield,
  Users,
  UserCog,
  UserCircle,
  Settings,
  ScrollText,
  FolderTree,
  Tags,
  LayoutGrid,
  Target,
  Menu: MenuIcon,
};

function resolveIcon(name: string | null | undefined): LucideIcon {
  if (!name) return LayoutDashboard;
  return ICON_MAP[name] ?? LayoutDashboard;
}

interface MenuNode {
  id: string;
  parentId: string | null;
  name: string;
  path: string | null;
  icon: string | null;
  sortOrder: number;
  isVisible: boolean;
  children: MenuNode[];
}

interface AdminSidebarProps {
  collapsed: boolean;
}

export function AdminSidebar({ collapsed }: AdminSidebarProps) {
  const pathname = usePathname();
  const [tree, setTree] = useState<MenuNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch("/api/sys/user-menus", { cache: "no-store" });
        const json = (await res.json()) as {
          success?: boolean;
          data?: { tree?: MenuNode[] };
        };
        if (!mounted) return;
        if (json.success && json.data?.tree) {
          setTree(json.data.tree);
          const groupIds = new Set<string>(
            json.data.tree
              .filter((n) => n.children?.length > 0)
              .map((n) => n.id),
          );
          setExpandedGroups(groupIds);
        }
      } catch {
        // 静默失败
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
  }, []);

  const isActive = useCallback(
    (path: string | null) => {
      if (!path) return false;
      if (path === "/admin") return pathname === "/admin";
      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname],
  );

  function toggleGroup(id: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "relative z-50 flex flex-col border-r bg-background transition-all duration-200",
        collapsed ? "w-16" : "w-60",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex h-14 shrink-0 items-center border-b",
          collapsed ? "justify-center px-2" : "px-4",
        )}
      >
        <Link href="/admin" className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="MossGap" className="size-8 rounded-lg" />
          {!collapsed && (
            <span className="font-heading text-sm font-bold tracking-wider">
              MOSS<span className="text-primary">GAP</span>
            </span>
          )}
        </Link>
      </div>

      {/* 导航 */}
      <nav className="flex-1 space-y-1 overflow-y-auto overflow-x-visible p-2">
        {loading ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">加载中...</div>
        ) : tree.length === 0 ? (
          <div className="px-3 py-2 text-xs text-muted-foreground">
            暂无可用菜单
          </div>
        ) : (
          tree.map((node) => (
            <MenuNodeItem
              key={node.id}
              node={node}
              collapsed={collapsed}
              isActive={isActive}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
            />
          ))
        )}
      </nav>
    </aside>
  );
}

interface MenuNodeItemProps {
  node: MenuNode;
  collapsed: boolean;
  isActive: (path: string | null) => boolean;
  expandedGroups: Set<string>;
  toggleGroup: (id: string) => void;
}

function MenuNodeItem({
  node,
  collapsed,
  isActive,
  expandedGroups,
  toggleGroup,
}: MenuNodeItemProps) {
  const Icon = resolveIcon(node.icon);
  const hasChildren = node.children.length > 0;
  const isExpanded = expandedGroups.has(node.id);

  const isSelfOrChildActive = (() => {
    if (isActive(node.path)) return true;
    if (!hasChildren) return false;
    return node.children.some((c) => isActive(c.path));
  })();

  // 折叠模式
  if (collapsed) {
    // 有子菜单：hover 浮窗
    if (hasChildren) {
      return (
        <CollapsedFlyout
          node={node}
          icon={Icon}
          isSelfOrChildActive={isSelfOrChildActive}
          isActive={isActive}
        />
      );
    }
    // 无子菜单：Tooltip + Link
    const link = node.path ?? "/admin";
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={link}
            className={cn(
              "flex items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isSelfOrChildActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{node.name}</TooltipContent>
      </Tooltip>
    );
  }

  // 展开模式 + 分组容器
  if (hasChildren) {
    return (
      <div>
        <button
          type="button"
          onClick={() => toggleGroup(node.id)}
          className={cn(
            "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
            isSelfOrChildActive
              ? "text-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="flex-1 truncate text-left">{node.name}</span>
          {isExpanded ? (
            <ChevronDown className="size-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="size-4 text-muted-foreground" />
          )}
        </button>
        {isExpanded && (
          <div className="ml-4 border-l pl-2">
            {node.children.map((child) => {
              const ChildIcon = resolveIcon(child.icon);
              const childActive = isActive(child.path);
              if (!child.path) return null;
              return (
                <Link
                  key={child.id}
                  href={child.path}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-1.5 text-sm transition-colors",
                    childActive
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <ChildIcon className="size-3.5 shrink-0" />
                  <span className="truncate">{child.name}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // 展开模式 + 叶子节点
  if (!node.path) return null;
  const active = isActive(node.path);
  return (
    <Link
      href={node.path}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <Icon className="size-4 shrink-0" />
      <span className="truncate">{node.name}</span>
    </Link>
  );
}

// ─── 折叠模式浮窗 ──────────────────────────────────────────

interface CollapsedFlyoutProps {
  node: MenuNode;
  icon: LucideIcon;
  isSelfOrChildActive: boolean;
  isActive: (path: string | null) => boolean;
}

function CollapsedFlyout({
  node,
  icon: Icon,
  isSelfOrChildActive,
  isActive,
}: CollapsedFlyoutProps) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const updateCoords = useCallback(() => {
    const el = triggerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setCoords({ top: rect.top, left: rect.right + 4 });
  }, []);

  function handleEnter() {
    updateCoords();
    setOpen(true);
  }

  function handleLeave() {
    setOpen(false);
  }

  const visibleChildren = node.children.filter((c) => c.path);

  return (
    <div className="relative" onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      <button
        ref={triggerRef}
        type="button"
        className={cn(
          "flex w-full items-center justify-center rounded-md px-3 py-2 text-sm font-medium transition-colors",
          isSelfOrChildActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-4 shrink-0" />
      </button>

      {mounted && open && visibleChildren.length > 0
        ? createPortal(
            <div
              className="fixed z-[100] min-w-[180px] rounded-md border bg-popover p-1.5 shadow-md"
              style={{ top: coords.top, left: coords.left }}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={handleLeave}
            >
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground">
                {node.name}
              </p>
              <div className="space-y-0.5">
                {visibleChildren.map((child) => {
                  const ChildIcon = resolveIcon(child.icon);
                  const childActive = isActive(child.path);
                  return (
                    <Link
                      key={child.id}
                      href={child.path!}
                      className={cn(
                        "flex items-center gap-2 rounded px-2 py-1.5 text-sm transition-colors",
                        childActive
                          ? "bg-muted font-medium text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                    >
                      <ChildIcon className="size-3.5 shrink-0" />
                      <span className="whitespace-nowrap">{child.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
