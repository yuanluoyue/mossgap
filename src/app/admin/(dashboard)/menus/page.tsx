import { listSysMenus, type SysMenuRow } from "@/db/queries";
import { MenusManager } from "./menus-manager";

export const dynamic = "force-dynamic";

export default async function MenusPage() {
  const menus = await listSysMenus();

  // 构建菜单树
  const tree = buildTree(menus);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight">菜单管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          共 {menus.length} 个菜单项 · 父菜单 path 为空仅作分组容器
        </p>
      </div>

      <MenusManager tree={tree} flatMenus={menus} />
    </div>
  );
}

interface MenuNode extends SysMenuRow {
  children: MenuNode[];
}

function buildTree(menus: SysMenuRow[]): MenuNode[] {
  const map = new Map<string, MenuNode>();
  const roots: MenuNode[] = [];
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
