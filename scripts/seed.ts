/**
 * 数据库 seed 脚本。
 *
 * 用法：
 *   pnpm db:seed:local   # 在本地 wrangler D1 中插入 admin/123456 + RBAC 初始数据
 *   pnpm db:seed:remote  # 打印远程 D1 执行所需的 SQL（需手动用 wrangler 执行）
 *
 * 说明：
 * - admin 账号存数据库 admins 表，密码用 PBKDF2 哈希。
 * - RBAC：默认 admin 角色 + mossgap 菜单树 + 角色/菜单映射 + 用户/角色映射。
 * - 全部幂等：已存在则跳过或补齐缺失项。
 */
import { getPlatformProxy } from "wrangler";
import { drizzle } from "drizzle-orm/d1";
import { eq, and, isNull } from "drizzle-orm";
import {
  admins,
  sysRoles,
  sysMenus,
  sysRoleMenus,
  sysUserRoles,
} from "../src/db/schema";
import { hashPassword } from "../src/lib/password";

const DEFAULT_USERNAME = "admin";
const DEFAULT_PASSWORD = "123456";
const DEFAULT_EMAIL = "admin@mossgap.local";
const DEFAULT_NAME = "超级管理员";

/** mossgap 菜单树（中文，B 端只支持简体中文）。 */
const menuTree = [
  { name: "仪表盘", path: "/admin", icon: "LayoutDashboard", sort_order: 0 },
  {
    name: "内容管理",
    icon: "FolderOpen",
    sort_order: 1,
    children: [
      { name: "游戏管理", path: "/admin/games", icon: "Gamepad2", sort_order: 0 },
      { name: "分类管理", path: "/admin/categories", icon: "FolderTree", sort_order: 1 },
      { name: "标签管理", path: "/admin/tags", icon: "Tags", sort_order: 2 },
      { name: "专题管理", path: "/admin/collections", icon: "LayoutGrid", sort_order: 3 },
      { name: "反馈管理", path: "/admin/feedbacks", icon: "MessageSquare", sort_order: 4 },
      { name: "OSS 用量", path: "/admin/oss-usage", icon: "HardDrive", sort_order: 5 },
    ],
  },
  {
    name: "系统管理",
    icon: "Shield",
    sort_order: 2,
    children: [
      { name: "用户管理", path: "/admin/users", icon: "Users", sort_order: 0 },
      { name: "角色管理", path: "/admin/roles", icon: "UserCog", sort_order: 1 },
      { name: "菜单管理", path: "/admin/menus", icon: "Menu", sort_order: 2 },
      { name: "系统配置", path: "/admin/settings", icon: "Settings", sort_order: 3 },
      { name: "操作日志", path: "/admin/audit-logs", icon: "ScrollText", sort_order: 4 },
    ],
  },
];

// ===== 本地 seed（通过 wrangler 本地 D1 binding） =====

async function seedLocal() {
  const proxy = await getPlatformProxy({ configPath: "./wrangler.jsonc" });
  try {
    const db = drizzle(proxy.env.DB as D1Database, {
      schema: { admins, sysRoles, sysMenus, sysRoleMenus, sysUserRoles },
    });

    // 1. admin 账号
    let adminId: string;
    const existingAdmin = await db
      .select({ id: admins.id, email: admins.email, name: admins.name })
      .from(admins)
      .where(eq(admins.username, DEFAULT_USERNAME))
      .limit(1);

    if (existingAdmin.length === 0) {
      const passwordHash = await hashPassword(DEFAULT_PASSWORD);
      const [inserted] = await db
        .insert(admins)
        .values({
          username: DEFAULT_USERNAME,
          passwordHash,
          email: DEFAULT_EMAIL,
          name: DEFAULT_NAME,
          isActive: 1,
        })
        .returning({ id: admins.id });
      adminId = inserted!.id;
      console.log(`[ok] 已插入 admin: ${DEFAULT_USERNAME} / ${DEFAULT_PASSWORD}`);
    } else {
      adminId = existingAdmin[0].id;
      // 补齐 email / name（向前兼容旧数据）
      if (!existingAdmin[0].email || !existingAdmin[0].name) {
        await db
          .update(admins)
          .set({
            email: existingAdmin[0].email ?? DEFAULT_EMAIL,
            name: existingAdmin[0].name ?? DEFAULT_NAME,
            isActive: 1,
          })
          .where(eq(admins.id, adminId));
        console.log(`[ok] 已补齐 admin email/name`);
      } else {
        console.log(`[skip] admin "${DEFAULT_USERNAME}" 已存在`);
      }
    }

    // 2. admin 角色
    let adminRoleId: string;
    const existingRole = await db
      .select({ id: sysRoles.id })
      .from(sysRoles)
      .where(eq(sysRoles.code, "admin"))
      .limit(1);
    if (existingRole.length === 0) {
      const [inserted] = await db
        .insert(sysRoles)
        .values({
          name: "超级管理员",
          code: "admin",
          description: "拥有全部菜单权限",
          sortOrder: 0,
          isActive: 1,
        })
        .returning({ id: sysRoles.id });
      adminRoleId = inserted!.id;
      console.log(`[ok] 已插入角色: admin`);
    } else {
      adminRoleId = existingRole[0].id;
      console.log(`[skip] 角色 admin 已存在`);
    }

    // 3. 菜单树（幂等：按 name + parent 判断是否缺失）
    const allMenuIds: string[] = [];
    for (const item of menuTree) {
      const children = item.children ?? [];
      let parentId: string;

      const existingParent = await db
        .select({ id: sysMenus.id })
        .from(sysMenus)
        .where(and(eq(sysMenus.name, item.name), isNull(sysMenus.parentId)))
        .limit(1);

      if (existingParent.length === 0) {
        const [inserted] = await db
          .insert(sysMenus)
          .values({
            name: item.name,
            path: children.length > 0 ? null : item.path,
            icon: item.icon,
            sortOrder: item.sort_order,
            isVisible: 1,
          })
          .returning({ id: sysMenus.id });
        parentId = inserted!.id;
        allMenuIds.push(parentId);
        console.log(`[ok] 菜单(父): ${item.name}`);
      } else {
        parentId = existingParent[0].id;
        allMenuIds.push(parentId);
      }

      for (const child of children) {
        const existingChild = await db
          .select({ id: sysMenus.id })
          .from(sysMenus)
          .where(and(eq(sysMenus.name, child.name), eq(sysMenus.parentId, parentId)))
          .limit(1);
        if (existingChild.length === 0) {
          const [inserted] = await db
            .insert(sysMenus)
            .values({
              parentId,
              name: child.name,
              path: child.path,
              icon: child.icon,
              sortOrder: child.sort_order,
              isVisible: 1,
            })
            .returning({ id: sysMenus.id });
          allMenuIds.push(inserted!.id);
          console.log(`[ok] 菜单(子): ${child.name}`);
        } else {
          allMenuIds.push(existingChild[0].id);
        }
      }
    }

    // 4. 角色 ↔ 菜单（admin 角色拥有全部菜单，幂等）
    for (const menuId of allMenuIds) {
      const exists = await db
        .select({ roleId: sysRoleMenus.roleId })
        .from(sysRoleMenus)
        .where(and(eq(sysRoleMenus.roleId, adminRoleId), eq(sysRoleMenus.menuId, menuId)))
        .limit(1);
      if (exists.length === 0) {
        await db.insert(sysRoleMenus).values({ roleId: adminRoleId, menuId });
      }
    }
    console.log(`[ok] 角色-菜单映射已确保齐全 (${allMenuIds.length})`);

    // 5. 用户 ↔ 角色（admin 用户 ↔ admin 角色，幂等）
    const existingUserRole = await db
      .select({ adminId: sysUserRoles.adminId })
      .from(sysUserRoles)
      .where(eq(sysUserRoles.adminId, adminId))
      .limit(1);
    if (existingUserRole.length === 0) {
      await db.insert(sysUserRoles).values({ adminId, roleId: adminRoleId });
      console.log(`[ok] 用户-角色映射已建立`);
    } else {
      console.log(`[skip] 用户-角色映射已存在`);
    }

    console.log("\n[done] seed 完成");
  } finally {
    await proxy.dispose();
  }
}

// ===== 远程 seed（生成 SQL 交给 wrangler 执行，幂等） =====

function sqlStr(v: string | undefined | null): string {
  if (v == null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

async function seedRemote() {
  const passwordHash = await hashPassword(DEFAULT_PASSWORD);
  const now = Math.floor(Date.now() / 1000);
  const adminId = crypto.randomUUID();
  const adminRoleId = crypto.randomUUID();

  const lines: string[] = [];
  lines.push("-- ===== Remote Seed SQL（幂等，可重复执行） =====");

  // admin 账号（INSERT OR IGNORE 依赖 username 唯一索引）
  lines.push(
    `INSERT OR IGNORE INTO admins (id, username, password_hash, email, name, is_active, created_at, updated_at) VALUES (${sqlStr(adminId)}, ${sqlStr(DEFAULT_USERNAME)}, ${sqlStr(passwordHash)}, ${sqlStr(DEFAULT_EMAIL)}, ${sqlStr(DEFAULT_NAME)}, 1, ${now}, ${now});`,
  );

  // admin 角色（INSERT OR IGNORE 依赖 code 唯一索引）
  lines.push(
    `INSERT OR IGNORE INTO sys_roles (id, name, code, description, sort_order, is_active, created_at, updated_at) VALUES (${sqlStr(adminRoleId)}, '超级管理员', 'admin', '拥有全部菜单权限', 0, 1, ${now}, ${now});`,
  );

  // 菜单：用 NOT EXISTS 守卫 (name, parent_id) 避免重复
  const parentIds: { name: string; id: string }[] = [];
  for (const item of menuTree) {
    const children = item.children ?? [];
    const parentId = crypto.randomUUID();
    const path = children.length > 0 ? null : item.path;
    lines.push(
      `INSERT INTO sys_menus (id, parent_id, name, path, icon, sort_order, is_visible, created_at, updated_at) SELECT ${sqlStr(parentId)}, NULL, ${sqlStr(item.name)}, ${sqlStr(path)}, ${sqlStr(item.icon)}, ${item.sort_order}, 1, ${now}, ${now} WHERE NOT EXISTS (SELECT 1 FROM sys_menus WHERE name = ${sqlStr(item.name)} AND parent_id IS NULL);`,
    );
    parentIds.push({ name: item.name, id: parentId });

    for (const child of children) {
      const childId = crypto.randomUUID();
      lines.push(
        `INSERT INTO sys_menus (id, parent_id, name, path, icon, sort_order, is_visible, created_at, updated_at) SELECT ${sqlStr(childId)}, (SELECT id FROM sys_menus WHERE name = ${sqlStr(item.name)} AND parent_id IS NULL LIMIT 1), ${sqlStr(child.name)}, ${sqlStr(child.path)}, ${sqlStr(child.icon)}, ${child.sort_order}, 1, ${now}, ${now} WHERE NOT EXISTS (SELECT 1 FROM sys_menus m JOIN sys_menus p ON m.parent_id = p.id WHERE m.name = ${sqlStr(child.name)} AND p.name = ${sqlStr(item.name)});`,
      );
    }
  }

  // 角色 ↔ 全部菜单（INSERT OR IGNORE 依赖复合主键）
  lines.push(
    `INSERT OR IGNORE INTO sys_role_menus (role_id, menu_id, created_at) SELECT r.id, m.id, ${now} FROM sys_roles r, sys_menus m WHERE r.code = 'admin' AND NOT EXISTS (SELECT 1 FROM sys_role_menus rm WHERE rm.role_id = r.id AND rm.menu_id = m.id);`,
  );

  // 用户 ↔ 角色（INSERT OR IGNORE 依赖复合主键）
  lines.push(
    `INSERT OR IGNORE INTO sys_user_roles (admin_id, role_id, created_at) SELECT a.id, r.id, ${now} FROM admins a, sys_roles r WHERE a.username = 'admin' AND r.code = 'admin' AND NOT EXISTS (SELECT 1 FROM sys_user_roles ur WHERE ur.admin_id = a.id AND ur.role_id = r.id);`,
  );

  const sql = lines.join("\n");

  const { writeFileSync } = await import("fs");
  writeFileSync("seed-remote.sql", sql, "utf-8");
  console.log("[ok] seed SQL 已写入 seed-remote.sql");
}

async function main() {
  const args = process.argv.slice(2);
  const isRemote = args.includes("--remote");
  const isLocal = args.includes("--local");

  if (!isLocal && !isRemote) {
    console.error("用法: tsx scripts/seed.ts --local | --remote");
    process.exit(1);
  }

  if (isRemote) {
    await seedRemote();
  } else {
    await seedLocal();
  }
}

main().catch((err) => {
  console.error("[error]", err);
  process.exit(1);
});
